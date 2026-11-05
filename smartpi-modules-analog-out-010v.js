module.exports = function (RED) {

    var MAX_VOLTAGE = 10;
    var NUM_CHANNELS = 4;

    function validVoltage(v) {
        return typeof v === "number" && !isNaN(v) && v >= 0 && v <= MAX_VOLTAGE;
    }

    // Only real numbers or numeric strings - Number() would otherwise turn
    // "", null and booleans silently into 0 or 1 V.
    function toVoltage(v) {
        if (typeof v === "number") return v;
        if (typeof v === "string" && v.trim() !== "") return Number(v);
        return NaN;
    }

    function formatVoltage(v) {
        return (Math.round(v * 100) / 100) + " V";
    }

    // needle resolves the promise on every HTTP response, successful or not
    // - an error status lands here in .then(), not in .catch(), which only
    // ever sees transport failures (timeouts, DNS, connection refused).
    function handleResponse(node, msg, channel, nodeSend, nodeDone) {
        return function (res) {
            msg.statusCode = res.statusCode;
            msg.headers = res.headers;
            msg.responseUrl = res.url;

            var body = res.body;
            if (typeof body === "string" || Buffer.isBuffer(body)) {
                try {
                    body = JSON.parse(body.toString());
                } catch (e) {
                    body = { message: body.toString() };
                }
            }
            body = body || {};

            if (res.statusCode === 401) {
                node.error("Token invalid or revoked - generate a new one in the SmartPi web UI (Settings > API tokens) and update this node.", msg);
                node.status({ fill: "red", shape: "ring", text: "unauthorized" });
                msg.payload = body;
                nodeDone();
                return;
            }

            if (res.statusCode >= 400) {
                var reason = body.message || body.error || ("HTTP " + res.statusCode);
                node.error(reason, msg);
                node.status({ fill: "red", shape: "ring", text: reason });
                msg.payload = body;
                nodeDone();
                return;
            }

            // The module's full status (all four channels incl. raw DAC
            // codes and EEPROM power-up values) stays available on
            // msg.moduleStatus - payload is reduced to plain voltage numbers
            // so the node can feed a gauge or chart directly.
            var voltages = (body.channels || []).map(function (ch) { return ch.voltage; });
            msg.moduleStatus = body;

            if (channel === "all") {
                msg.payload = voltages;
                node.status({ fill: "green", shape: "dot", text: voltages.map(formatVoltage).join(" | ") });
            } else {
                msg.payload = voltages[channel - 1];
                msg.channel = channel;
                node.status({ fill: "green", shape: "dot", text: "out" + channel + ": " + formatVoltage(msg.payload) });
            }

            nodeSend(msg);
            nodeDone();
        };
    }

    function handleError(node, msg, nodeDone, url) {
        return function (err) {
            if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
                node.error(RED._("common.notification.errors.no-response"), msg);
                node.status({ fill: "red", shape: "ring", text: "common.notification.errors.no-response" });
            } else {
                node.error(err, msg);
                node.status({ fill: "red", shape: "ring", text: err.code });
            }
            msg.payload = err.toString() + " : " + url;
            msg.statusCode = err.code || (err.response ? err.response.statusCode : undefined);
            nodeDone();
        };
    }

    // Turns msg.payload into the voltages array the server's multi-channel
    // endpoint expects (null = leave that channel unchanged). Accepts a
    // single number (all four channels), an array in channel order, or an
    // object keyed by channel number ({"1": 2.5, "3": 10}).
    function voltagesFromPayload(payload) {
        var voltages = [null, null, null, null];

        if (typeof payload === "number" || typeof payload === "string") {
            var v = toVoltage(payload);
            if (!validVoltage(v)) return null;
            return [v, v, v, v];
        }

        if (Array.isArray(payload)) {
            if (payload.length > NUM_CHANNELS) return null;
            for (var i = 0; i < payload.length; i++) {
                if (payload[i] === null || payload[i] === undefined) continue;
                var n = toVoltage(payload[i]);
                if (!validVoltage(n)) return null;
                voltages[i] = n;
            }
            return voltages;
        }

        if (payload && typeof payload === "object") {
            for (var key in payload) {
                var ch = parseInt(key, 10);
                if (isNaN(ch) || ch < 1 || ch > NUM_CHANNELS) return null;
                if (payload[key] === null || payload[key] === undefined) continue;
                var m = toVoltage(payload[key]);
                if (!validVoltage(m)) return null;
                voltages[ch - 1] = m;
            }
            return voltages;
        }

        return null;
    }

    // Accepts 1-4 as number or string, also "out1".."out4" and "all";
    // returns 1-4, "all" or null.
    function parseOutput(v) {
        if (v === "all") return "all";
        if (typeof v === "string") {
            v = v.trim().toLowerCase().replace(/^out(put)?\s*/, "");
            if (!/^[1-4]$/.test(v)) return null;
        }
        var n = Number(v);
        return Number.isInteger(n) && n >= 1 && n <= NUM_CHANNELS ? n : null;
    }

    function SmartPiAnalogOut010V(config) {

        var needle = require('needle');

        RED.nodes.createNode(this, config);
        var node = this;
        this.indicator = config.indicator;
        this.server = config.server;
        this.address = config.address;
        // "topic" (default): msg.topic picks the output per message, so one
        // node serves all four - Node-RED nodes can only have one input.
        // "1"-"4" or "all": fixed, msg.topic is then ignored.
        this.channel = config.channel || "topic";
        this.readonly = config.readonly;
        this.persist = config.persist;
        // See smartpi-modules-digital-out.js for why this is read from
        // this.credentials rather than config, and why the ternary guard
        // (rather than this.credentials.token directly) is needed for a
        // node that has never had a credential saved.
        this.token = this.credentials ? this.credentials.token : undefined;

        var status = [];
        if (!this.token) {
            status.push("no token configured");
        }
        if (!/^0[xX][0-9a-fA-F]+$/.test(this.address || "")) {
            status.push("address is not a hex value");
        }
        if (status.length > 0) {
            node.status({ fill: "yellow", shape: "ring", text: status.join(", ") });
        }

        node.on('input', function (msg, nodeSend, nodeDone) {

            var options = {
                json: true,
                headers: {
                    authorization: "Bearer " + (node.token || "")
                }
            };

            // Which output: msg.channel always wins; otherwise msg.topic in
            // "topic" mode, else the configured one. Only the addressed
            // output is written, the other three stay as they are.
            var channel = node.channel;
            var source = "configured output";
            if (msg.channel !== undefined && msg.channel !== null && msg.channel !== "") {
                channel = msg.channel;
                source = "msg.channel";
            } else if (channel === "topic") {
                channel = msg.topic;
                source = "msg.topic";
                // Readonly without a topic just reports all four.
                if (node.readonly && (channel === undefined || channel === null || channel === "")) {
                    channel = "all";
                }
            }
            channel = parseOutput(channel);
            if (channel === null) {
                node.error(source + " must be the output 1-4 (or \"all\"), got: " + JSON.stringify(source === "msg.topic" ? msg.topic : (source === "msg.channel" ? msg.channel : node.channel)), msg);
                node.status({ fill: "red", shape: "ring", text: "invalid output" });
                nodeDone();
                return;
            }

            var url = node.server + "/api/v1/module/analogout010v/" + node.address;
            var method = "get";
            var data = null;

            if (!node.readonly) {
                method = "put";
                var persist = msg.persist !== undefined ? Boolean(msg.persist) : Boolean(node.persist);

                if (channel === "all") {
                    var voltages = voltagesFromPayload(msg.payload);
                    if (voltages === null) {
                        node.error("msg.payload must be a number, an array of up to 4 numbers or an object {channel: voltage}, each between 0 and 10 (V), got: " + JSON.stringify(msg.payload), msg);
                        node.status({ fill: "red", shape: "ring", text: "invalid payload" });
                        nodeDone();
                        return;
                    }
                    data = { voltages: voltages, persist: persist };
                } else {
                    var voltage = toVoltage(msg.payload);
                    if (!validVoltage(voltage)) {
                        node.error("msg.payload must be a number between 0 and 10 (V), got: " + JSON.stringify(msg.payload), msg);
                        node.status({ fill: "red", shape: "ring", text: "invalid payload" });
                        nodeDone();
                        return;
                    }
                    url = url + "/" + channel + "/" + voltage;
                    if (persist) {
                        url = url + "?persist=true";
                    }
                }
            }

            needle(method, url, data, options)
                .then(handleResponse(node, msg, channel, nodeSend, nodeDone))
                .catch(handleError(node, msg, nodeDone, url));
        });
    }

    // The credentials schema also has to be declared here, server-side, not
    // just in the .html file's client-side registerType() call - see
    // smartpi-modules-digital-out.js.
    RED.nodes.registerType("smartpi-e.analog-out-010v", SmartPiAnalogOut010V, {
        credentials: {
            token: { type: "password" }
        }
    });
}
