module.exports = function(RED) {

    function SmartPiDigitalOut(config) {

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
                    opts.method = "PUT";
                } else {
                    opts.method = "GET";
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


                got(url, opts).then(res => {
                    msg.statusCode = res.statusCode;
                    msg.headers = res.headers;
                    msg.responseUrl = res.url;
                    msg.payload = JSON.parse(res.body);
                    msg.retry = 0;

                    node.status({});
                    nodeSend(msg);
                    nodeDone();
                }).catch(err => {
                    // Pre 2.1, any errors would be sent to both Catch node and sent on as normal.
                    // This is not ideal but is the legacy behaviour of the node.
                    // 2.1 adds the 'senderr' option, if set to true, will *only* send errors
                    // to Catch nodes. If false, it still does both behaviours.
                    // TODO: 3.0 - make it one or the other.

                    if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
                        node.error(RED._("common.notification.errors.no-response"), msg);
                        node.status({ fill: "red", shape: "ring", text: "common.notification.errors.no-response" });
                    } else {
                        node.error(err, msg);
                        node.status({ fill: "red", shape: "ring", text: err.code });
                    }
                    msg.payload = err.toString() + " : " + url;
                    msg.statusCode = err.code || (err.response ? err.response.statusCode : undefined);
                    if (node.metric() && timingLog) {
                        emitTimingMetricLog(err.timings, msg);
                    }
                    nodeDone();
                });



            } else {
                console.log("Input not 0 or 1");
            }


        });
    }
    RED.nodes.registerType("smartpi-e.digital-out", SmartPiDigitalOut);
}