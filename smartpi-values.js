module.exports = function(RED) {
    function SmartPiValues(config) {
        RED.nodes.createNode(this, config);

        this.indicator = config.indicator;
        var node = this;

        watch = require('node-watch');
        watch('/var/tmp/smartpi/smartpi_values', { recursive: true }, function(evt, name) {
            fs.readFile('/var/tmp/smartpi/smartpi_values', 'utf8', function(err, data) {
                if (err) {
                    return console.log(err);
                }
                var values = data.split(';');
                var output = {
                    "date": values[0].replace(/['"]+/g, ''),
                    "i1": parseFloat(values[1]),
                    "i2": parseFloat(values[2]),
                    "i3": parseFloat(values[3]),
                    "i4": parseFloat(values[4]),
                    "u1": parseFloat(values[5]),
                    "u2": parseFloat(values[6]),
                    "u3": parseFloat(values[7]),
                    "p1": parseFloat(values[8]),
                    "p2": parseFloat(values[9]),
                    "p3": parseFloat(values[10]),
                    "cos1": parseFloat(values[11]),
                    "cos2": parseFloat(values[12]),
                    "cos3": parseFloat(values[13]),
                    "f1": parseFloat(values[14]),
                    "f2": parseFloat(values[15]),
                    "f3": parseFloat(values[16]),
                    "ec1": parseFloat(values[17]),
                    "ec2": parseFloat(values[18]),
                    "ec3": parseFloat(values[19]),
                    "ep1": parseFloat(values[20]),
                    "ep2": parseFloat(values[21]),
                    "ep3": parseFloat(values[22]),
                    "bal": parseFloat(values[23])
                }
                node.send({ payload: output });
            });
        });

    }



    RED.nodes.registerType("smartpi-values", SmartPiValues);
}