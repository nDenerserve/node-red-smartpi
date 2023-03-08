module.exports = function(RED) {

    function ReadValues(node, fs) {

        var out = 0.0;

        data = fs.readFileSync('/var/tmp/smartpi/smartpi_values', 'utf8');

        var values = data.split(';');

        switch (node.indicator) {
            case "p":
                out = parseFloat(values[8]) + parseFloat(values[9]) + parseFloat(values[10]);
                break;
            case "p1":
                out = parseFloat(values[8]);
                break;
            case "p2":
                out = parseFloat(values[9]);
                break;
            case "p3":
                out = parseFloat(values[10]);
                break;
            case "i":
                out = parseFloat(values[1]) + parseFloat(values[2]) + parseFloat(values[3]);
                break;
            case "i1":
                out = parseFloat(values[1]);
                break;
            case "i2":
                out = parseFloat(values[2]);
                break;
            case "i3":
                out = parseFloat(values[3]);
                break;
            case "i4":
                out = parseFloat(values[4]);
                break;
            case "v1":
                out = parseFloat(values[5]);
                break;
            case "v2":
                out = parseFloat(values[6]);
                break;
            case "v3":
                out = parseFloat(values[7]);
                break;
        }
        return out;
    }



    function SmartPiInput(config) {
        RED.nodes.createNode(this, config);

        this.indicator = config.indicator;
        this.usetrigger = config.usetrigger;

        var node = this;

        const fs = require('fs');
        const watch = require('node-watch');
        var output = 0.0;
        if (this.usetrigger == false) {
            watch('/var/tmp/smartpi/smartpi_values', { recursive: true }, function(evt, name) {
                output = ReadValues(node, fs);
                node.send({ payload: output });
            });
        } else {
            node.on('input', function(msg) {
                if ((msg.payload == "1") || (msg.payload == true)) {
                    output = ReadValues(node, fs);
                    node.send({ payload: output });
                }
            });
        }
    }



    RED.nodes.registerType("smartpi-input", SmartPiInput);
}