# node-red-smartpi
## Install

To install the stable version use the `Menu - Manage palette` option and search for `node-red-smartpiinput`, or run the following command in your Node-RED user directory - typically `~/.node-red`:

    npm i node-red-smartpiinput

Execution environment of this node is Node-RED v1.0 or later.

## Usage
Use the smartpi-input module to read out and evaluate the measured values of the SmartPi.
![SmartPi input settings](https://github.com/nDenerserve/node-red-smartpi/blob/main/img/smartpi-input-properties.png?raw=true)

The value to be used can be set in the settings. The measured values are output at one second intervals.

The smartpi-treshold-trigger can convert the measured values of the smartpi-input node into logical values. For this purpose, it is specified in the settings of the node from which value (exceeding) the node outputs a 1 (rising threshold) and from which value (falling below) the node outputs a 0 again (falling threshold).
By specifying different values for the rising threshold and falling threshold, hysteresis is possible.
![SmartPi treshold trigger settings](https://github.com/nDenerserve/node-red-smartpi/blob/main/img/smartpi-treshold-trigger-properties.png?raw=true)
