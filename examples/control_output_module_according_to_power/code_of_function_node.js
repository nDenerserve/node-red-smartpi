var smartpidigitalout1, smartpidigitalout2, smartpidigitalout3, smartpidigitalout4;
var output = [false, false, false, false];

smartpidigitalout1 = context.get("smartpidigitalout1"); //to retrieve a variable  
smartpidigitalout2 = context.get("smartpidigitalout2"); //to retrieve a variable  
smartpidigitalout3 = context.get("smartpidigitalout3"); //to retrieve a variable  
smartpidigitalout4 = context.get("smartpidigitalout4"); //to retrieve a variable  


if ((msg.payload <= -450) && ((smartpidigitalout1 == false) || (typeof smartpidigitalout1 == 'undefined'))) {
    output = [true, false, false, false];
    context.set("smartpidigitalout1", true); // to store a variable
} else if ((msg.payload <= -450) && (smartpidigitalout1 == true) && ((smartpidigitalout2 == false) || (typeof smartpidigitalout2 == 'undefined'))) {
    output = [true, true, false, false];
    context.set("smartpidigitalout1", true); // to store a variable
    context.set("smartpidigitalout2", true); // to store a variable
} else if ((msg.payload <= -450) && (smartpidigitalout1 == true) && (smartpidigitalout2 == true) && ((smartpidigitalout3 == false) || (typeof smartpidigitalout3 == 'undefined'))) {
    output = [true, true, true, false];
    context.set("smartpidigitalout1", true); // to store a variable
    context.set("smartpidigitalout2", true); // to store a variable
    context.set("smartpidigitalout3", true); // to store a variable
} else if ((msg.payload <= -450) && (smartpidigitalout1 == true) && (smartpidigitalout2 == true) && (smartpidigitalout3 == true) && ((smartpidigitalout4 == false) || (typeof smartpidigitalout4 == 'undefined'))) {
    output = [true, true, true, true];
    context.set("smartpidigitalout1", true); // to store a variable
    context.set("smartpidigitalout2", true); // to store a variable
    context.set("smartpidigitalout3", true); // to store a variable
    context.set("smartpidigitalout4", true); // to store a variable
} else if ((msg.payload > 50) && (smartpidigitalout1 == true) && ((smartpidigitalout2 == false) || (typeof smartpidigitalout2 == 'undefined'))) {
    output = [false, false, false, false];
    context.set("smartpidigitalout1", false); // to store a variable
    context.set("smartpidigitalout2", false); // to store a variable
    context.set("smartpidigitalout3", false); // to store a variable
    context.set("smartpidigitalout4", false); // to store a variable
} else if ((msg.payload > 50) && (smartpidigitalout1 == true) && (smartpidigitalout2 == true) && ((smartpidigitalout3 == false) || (typeof smartpidigitalout3 == 'undefined'))) {
    output = [true, false, false, false];
    context.set("smartpidigitalout2", false); // to store a variable
    context.set("smartpidigitalout3", false); // to store a variable
    context.set("smartpidigitalout4", false); // to store a variable
} else if ((msg.payload > 50) && (smartpidigitalout1 == true) && (smartpidigitalout2 == true) && (smartpidigitalout3 == true) && ((smartpidigitalout4 == false) || (typeof smartpidigitalout4 == 'undefined'))) {
    output = [true, true, false, false];
    context.set("smartpidigitalout3", false); // to store a variable
    context.set("smartpidigitalout4", false); // to store a variable
} else if ((msg.payload > 50) && (smartpidigitalout1 == true) && (smartpidigitalout2 == true) && (smartpidigitalout3 == true) && (smartpidigitalout4 == true)) {
    output = [true, true, true, false];
    context.set("smartpidigitalout4", false); // to store a variable
} else {
    output = [smartpidigitalout1, smartpidigitalout2, smartpidigitalout3, smartpidigitalout4];    
}
node.warn(output);
msg = {
    payload: {
        port: output
    }
};
return msg;
