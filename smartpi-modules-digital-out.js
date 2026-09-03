module.exports = function (RED) {

    // needle resolves the promise on every HTTP response, successful or not
    // - a 401 lands here in .then(), not in .catch(), which only ever sees
    // transport failures (timeouts, DNS, connection refused). Without this
    // check a revoked or mistyped token showed up as a normal-looking
    // message carrying the server's {"message":"Invalid token."} body, with
    // no red status ring and no node.error() - easy to miss in a flow.
    function handleResponse(node, msg, nodeSend, nodeDone) {
        return function (res) {
            msg.statusCode = res.statusCode;
            msg.headers = res.headers;
            msg.responseUrl = res.url;
            msg.payload = JSON.parse(res.body);

            if (res.statusCode === 401) {
                node.error("Token invalid or revoked - generate a new one in the SmartPi web UI (Settings > API tokens) and update this node.", msg);
                node.status({ fill: "red", shape: "ring", text: "unauthorized" });
                nodeDone();
                return;
            }

            msg.retry = 0;
            node.status({});
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

    function SmartPiDigitalOut(config) {

        var needle = require('needle');

        RED.nodes.createNode(this, config);
        var node = this;
        this.indicator = config.indicator;
        this.server = config.server;
        // The token lives in credentials (see the .html file), not in
        // config/defaults: defaults are stored in flows.json in plain text
        // and travel with every exported or shared flow, credentials are
        // stored and encrypted separately by Node-RED. Credentials are not
        // part of `config` - RED.nodes.createNode(this, config) above is
        // what populates this.credentials, so it has to be read from there.
        // For a node that has never had a credential saved (a fresh node, or
        // one carried over from before this field was a credential),
        // this.credentials itself is undefined rather than an empty object.
        // Without the guard below, `this.credentials.token` throws
        // "Cannot read properties of undefined (reading 'token')" and the
        // node never comes up at all, rather than just having no token -
        // avoided using a plain conditional rather than ?. to keep working
        // on the Node.js versions in engines (>=12.22.12) in package.json.
        this.token = this.credentials ? this.credentials.token : undefined;
        this.bits = config.bits;
        this.output = config.output;
        this.readonly = config.readonly;

        // Visible without triggering the node or reading any log: an empty
        // token is silently sent as "Bearer " (see the Authorization header
        // below) and only shows up as a rejection once something fires the
        // node. This surfaces the same fact right on the flow canvas the
        // moment the node deploys.
        if (!this.token) {
            node.status({ fill: "yellow", shape: "ring", text: "no token configured" });
        }

        node.on('input', function (msg, nodeSend, nodeDone) {

            if ((msg.payload == "1") || (msg.payload == true) || (msg.payload == "0") || (msg.payload == false)) {


                var opts = {};
                opts.timeout = node.reqTimeout;
                opts.throwHttpErrors = false;
                // TODO: add UI option to auto decompress. Setting to false for 1.x compatibility
                opts.decompress = false;
                if (this.readonly == false) {
                    opts.method = "put";
                } else {
                    opts.method = "get";
                }

                opts.retry = 0;
                opts.responseType = 'buffer';
                opts.maxRedirects = 21;
                opts.ignoreInvalidCookies = true;
                opts.headers = {};
                opts.headers.Authorization = `Bearer ${this.token || ""}`


                var url = this.server + "/api/v1/module/digitalout/";

                for (let element of this.bits) {
                    if (element == false) {
                        url = url + "0"
                    } else if (element == true) {
                        url = url + "1"
                    }
                }

                if (this.readonly == false) {
                    url = url + "/" + this.output + "=";
                    if ((msg.payload == "1") || (msg.payload == true)) {
                        url = url + "1";
                    } else if ((msg.payload == "0") || (msg.payload == false)) {
                        url = url + "0";
                    }
                }

                var options = {
                    json: true,
                    headers: {
                        authorization: opts.headers.Authorization
                    }
                }

                needle(opts.method, url, null, options)
                    .then(handleResponse(node, msg, nodeSend, nodeDone))
                    .catch(handleError(node, msg, nodeSend, nodeDone, url));


            } else if (msg.payload.port) {

                var opts = {};
                opts.timeout = node.reqTimeout;
                opts.throwHttpErrors = false;
                // TODO: add UI option to auto decompress. Setting to false for 1.x compatibility
                opts.decompress = false;
                if (this.readonly == false) {
                    opts.method = "put";
                } else {
                    opts.method = "get";
                }

                opts.retry = 0;
                opts.responseType = 'buffer';
                opts.maxRedirects = 21;
                opts.ignoreInvalidCookies = true;
                opts.headers = {};
                opts.headers.Authorization = `Bearer ${this.token || ""}`


                var url = this.server + "/api/v1/module/digitalout/";

                for (let element of this.bits) {
                    if (element == false) {
                        url = url + "0"
                    } else if (element == true) {
                        url = url + "1"
                    }
                }

                if ((msg.payload.port.length == 4) && (this.readonly == false)) {

                    url = url + "/";

                    for (var i = 0; i < msg.payload.port.length; i++) {
                        if ((msg.payload.port[i] == true) || (msg.payload.port[i] == 1) || (msg.payload.port[i] == "true") || (msg.payload.port[i] == "High")) {
                            url = url + (i + 1) + "=1";
                            if (i < msg.payload.port.length - 1) {
                                url = url + ";"
                            }
                        } else if ((msg.payload.port[i] == false) || (msg.payload.port[i] == 0) || (msg.payload.port[i] == "false") || (msg.payload.port[i] == "Low")) {
                            url = url + (i + 1) + "=0";
                            if (i < msg.payload.port.length - 1) {
                                url = url + ";"
                            }
                        } else {
                            url = url + (i + 1) + "=x";
                            if (i < msg.payload.port.length - 1) {
                                url = url + ";"
                            }
                        }
                    }
                }

                var options = {
                    json: true,
                    headers: {
                        authorization: opts.headers.Authorization
                    }
                }

                needle(opts.method, url, null, options)
                    .then(handleResponse(node, msg, nodeSend, nodeDone))
                    .catch(handleError(node, msg, nodeSend, nodeDone, url));


            } else {
                console.log("Malformed input");
            }


        });
    }
    RED.nodes.registerType("smartpi-e.digital-out", SmartPiDigitalOut);
}
