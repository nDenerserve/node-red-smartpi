module.exports = function(RED) {
    function SmartPiEtemperatureValues(config) {
        RED.nodes.createNode(this, config);

        this.indicator = config.indicator;
        var node = this;

        fs = require('fs');
        watch = require('node-watch');
        watch('/var/tmp/smartpi/etemperature_values', { recursive: true }, function(evt, name) {
            fs.readFile('/var/tmp/smartpi/etemperature_values', 'utf8', function(err, data) {
                if (err) {
                    return console.log(err);
                }
                var values = data.split(';');
                var output = {
                    "date": values[0].replace(/['"]+/g, ''),
                    "t1": parseFloat(values[1]),
                    "t2": parseFloat(values[2]),
                    "t3": parseFloat(values[3]),
                    "t4": parseFloat(values[4]),
                    "t5": parseFloat(values[5]),
                    "t6": parseFloat(values[6]),
                    "t7": parseFloat(values[7]),
                    "t8": parseFloat(values[8]),
                    "t9": parseFloat(values[9]),
                    "t10": parseFloat(values[10]),
                    "t11": parseFloat(values[11]),
                    "t12": parseFloat(values[12]),
                    "t13": parseFloat(values[13]),
                    "t14": parseFloat(values[14]),
                    "t15": parseFloat(values[15]),
                    "t16": parseFloat(values[16]),
                }
                node.send({ payload: output });
            });
        });

    }



    RED.nodes.registerType("smartpi-e.digital-out", SmartPiEtemperatureValues);
}