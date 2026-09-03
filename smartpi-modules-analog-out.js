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

            // The module's full status (moduleaddress, setvalue, currentvalue)
            // stays available on msg.moduleStatus - payload is reduced to the
            // plain mA number so this node can feed a gauge or chart directly,
            // without an extra "extract property" step downstream.
            msg.moduleStatus = body;
            msg.payload = body.currentvalue;

            node.status({ fill: "green", shape: "dot", text: body.currentvalue + " mA" });
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

    function SmartPiAnalogOut(config) {

        var needle = require('needle');

        RED.nodes.createNode(this, config);
        var node = this;
        this.indicator = config.indicator;
        this.server = config.server;
        this.address = config.address;
        this.readonly = config.readonly;
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

            var opts = {};
            opts.timeout = node.reqTimeout;
            opts.throwHttpErrors = false;
            opts.decompress = false;
            opts.retry = 0;
            opts.responseType = 'buffer';
            opts.maxRedirects = 21;
            opts.ignoreInvalidCookies = true;
            opts.headers = {};
            opts.headers.Authorization = `Bearer ${this.token || ""}`;

            var url = this.server + "/api/v1/module/analogout420ma/" + this.address;

            if (this.readonly == false) {
                var current = Number(msg.payload);
                if (isNaN(current) || current < 4 || current > 20) {
                    node.error("msg.payload must be a number between 4 and 20 (mA), got: " + JSON.stringify(msg.payload), msg);
                    node.status({ fill: "red", shape: "ring", text: "invalid payload" });
                    nodeDone();
                    return;
                }
                opts.method = "put";
                url = url + "/" + current;
            } else {
                opts.method = "get";
            }

            var options = {
                json: true,
                headers: {
                    authorization: opts.headers.Authorization
                }
            };

            needle(opts.method, url, null, options)
                .then(handleResponse(node, msg, nodeSend, nodeDone))
                .catch(handleError(node, msg, nodeSend, nodeDone, url));

        });
    }

    // The credentials schema also has to be declared here, server-side, not
    // just in the .html file's client-side registerType() call - see
    // smartpi-modules-digital-out.js, where getting only the client-side
    // half of this right meant every save silently failed with "Credentials
    // type ... is not registered".
    RED.nodes.registerType("smartpi-e.analog-out", SmartPiAnalogOut, {
        credentials: {
            token: { type: "password" }
        }
    });
}
