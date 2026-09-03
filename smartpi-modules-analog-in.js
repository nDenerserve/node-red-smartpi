module.exports = function (RED) {

    // needle resolves the promise on every HTTP response, successful or not
    // - an error status lands here in .then(), not in .catch(), which only
    // ever sees transport failures (timeouts, DNS, connection refused).
    function handleResponse(node, msg, nodeSend, nodeDone) {
        return function (res) {
            msg.statusCode = res.statusCode;
            msg.headers = res.headers;
            msg.responseUrl = res.url;

            var body = JSON.parse(res.body);

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

            // The server has no way to know which jumper each channel is
            // wired for, so it always returns both a current and a voltage
            // reading per channel - node.channelTypes (one checkbox per
            // physical jumper, set in this node's config) picks the one
            // that is actually meaningful for that channel.
            var resolved = body.channels.map(function (ch, i) {
                var isCurrent = node.channelTypes[i];
                return {
                    channel: i + 1,
                    type: isCurrent ? "current" : "voltage",
                    unit: isCurrent ? "mA" : "V",
                    value: isCurrent ? ch.current : ch.voltage
                };
            });

            // payload is the four resolved values in channel order, for
            // wiring straight into a chart or a function node that just
            // wants numbers; channels carries the same values with their
            // type/unit made explicit; moduleStatus is the raw, unfiltered
            // server response (both current and voltage for all channels).
            msg.moduleStatus = body;
            msg.channels = resolved;
            msg.payload = resolved.map(function (c) { return c.value; });

            node.status({
                fill: "green", shape: "dot",
                text: resolved.map(function (c) { return c.value.toFixed(2) + c.unit; }).join(" / ")
            });
            nodeSend(msg);
            nodeDone();
        };
    }

    function handleError(node, msg, nodeSend, nodeDone, url) {
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

    function SmartPiAnalogIn(config) {

        var needle = require('needle');

        RED.nodes.createNode(this, config);
        var node = this;
        this.indicator = config.indicator;
        this.server = config.server;
        this.address = config.address;
        // One boolean per physical channel/jumper, in channel order: true =
        // that channel is wired for 4-20mA (report the current reading),
        // false = 0-10V (report the voltage reading). The server cannot
        // read the jumper itself, so it always returns both - see
        // handleResponse above, which is where this is actually used.
        this.channelTypes = config.channelTypes || [true, true, true, true];
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

        // This module has no "set" concept - reading is the only thing it
        // does, whether triggered by an input message (its payload is
        // ignored, it is only a trigger) or by the poll timer below.
        function read(msg, nodeSend, nodeDone) {
            var opts = {};
            opts.headers = {};
            opts.headers.Authorization = `Bearer ${node.token || ""}`;

            var url = node.server + "/api/v1/module/analogin/" + node.address;
            var options = {
                json: true,
                headers: { authorization: opts.headers.Authorization }
            };

            needle("get", url, null, options)
                .then(handleResponse(node, msg, nodeSend, nodeDone))
                .catch(handleError(node, msg, nodeSend, nodeDone, url));
        }

        // Optional independent polling, same as the other SmartPi modules:
        // 0 (default) disables it entirely, a positive interval in seconds
        // reads all four channels on that schedule regardless of input.
        var pollInterval = Number(config.pollInterval);
        var pollTimer = null;
        if (pollInterval > 0) {
            pollTimer = setInterval(function () {
                read({}, function (msg) { node.send(msg); }, function () {});
            }, pollInterval * 1000);
        }
        node.on('close', function (done) {
            if (pollTimer) {
                clearInterval(pollTimer);
                pollTimer = null;
            }
            done();
        });

        node.on('input', function (msg, nodeSend, nodeDone) {
            read(msg, nodeSend, nodeDone);
        });
    }

    // The credentials schema also has to be declared here, server-side, not
    // just in the .html file's client-side registerType() call - see
    // smartpi-modules-digital-out.js, where getting only the client-side
    // half of this right meant every save silently failed with "Credentials
    // type ... is not registered".
    RED.nodes.registerType("smartpi-e.analog-in", SmartPiAnalogIn, {
        credentials: {
            token: { type: "password" }
        }
    });
}
