module.exports = function(RED) {

    function SmartPiDigitalOut(config) {

        var needle = require('needle');

        RED.nodes.createNode(this, config);
        var node = this;
        this.indicator = config.indicator;
        this.server = config.server;
        this.token = config.token;
        this.bits = config.bits;
        this.output = config.output;
        this.readonly = config.readonly;

        node.on('input', function(msg, nodeSend, nodeDone) {

            if ((msg.payload == "1") || (msg.payload == "0")) {


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
                    if (msg.payload == "1") {
                        url = url + "1";
                    } else if (msg.payload == "0") {
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
                    .then(function(res) {

                        msg.statusCode = res.statusCode;
                        msg.headers = res.headers;
                        msg.responseUrl = res.url;
                        msg.payload = JSON.parse(res.body);
                        msg.retry = 0;

                        node.status({});
                        nodeSend(msg);
                        nodeDone();

                    })
                    .catch(function(err) {

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

                    });


            } else {
                console.log("Input not 0 or 1");
            }


        });
    }
    RED.nodes.registerType("smartpi-e.digital-out", SmartPiDigitalOut);
}