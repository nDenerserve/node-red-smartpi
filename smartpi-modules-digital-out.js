module.exports = function (RED) {
    const got = require('got');


    function SmartPiDigitalOut(config) {

        RED.nodes.createNode(this, config);
        var node = this;
        this.indicator = config.indicator;
        this.server = config.server;
        this.token = config.token;
        this.bits = config.bits;
        this.output = config.output;

        node.on('input', function (msg) {

            console.log("Config: ");
            console.log("Server: " + this.server);
            console.log("Token: " + this.token);
            console.log("Bits length: " + this.bits.length);
            console.log("Bits: " + this.bits);
            console.log("Output: " + this.output);

            var request = this.server + "/api/v1/module/digitalout/";

            for (let element of this.bits) {
                console.log(element);
                if (element == false) {
                    request = request + "0"
                } else if (element == true) {
                    request = request + "1"
                }
            }

            request = request + "/" + this.output;
            console.log(request);
            // var urlEncoded = encodeURIComponent(request);
            // console.log(urlEncoded);

            const { data } = got.post(request, {
                json: {
                    hello: 'world'
                }
            }).json();

            console.log(data);

            console.log("Input");
            console.log(msg.payload);
            node.send(msg);
        });
    }
    RED.nodes.registerType("smartpi-e.digital-out", SmartPiDigitalOut);
}