module.exports = function(RED) {
  const fetch = require('node-fetch');

  function castHubitatValue(dataType, value) {
    switch(dataType) {
      case "STRING":
        return value;
      case "ENUM":
        return value;
      case "NUMBER":
        return parseFloat(value);
      case "BOOL":
        return value == "true";
      default:
        console.warn("Unable to cast to dataType. Open an issue to report back the following output:");
        console.warn(dataType);
        console.warn(value);
        return value;
    }
  }

  function HubitatModeNode(config) {
    RED.nodes.createNode(this, config);

    this.hubitat = RED.nodes.getNode(config.server);
    this.name = config.name;
    this.sendEvent = config.sendEvent;
    this.currentMode = undefined;
    this.deviceId = 0;

    let node = this;

    if (!node.hubitat) {
      console.log("HubitatModeNode: Hubitat server not configured");
      return;
    }

    const callback = (event) => {
      console.debug("Mode(" + node.name + "): Callback called");
      console.debug(event);
      if (this.currentMode === undefined) {
        node.status({fill:"red", shape:"dot", text:"Uninitialized"});
        console.warn("Mode(" + node.name + "): Uninitialized");
        return;
      }

      if (this.sendEvent) {
        this.send({payload: event});
      }

      this.currentMode = event["value"];
      node.status({fill:"blue", shape:"dot", text: this.currentMode});
    }

    node.hubitat.registerCallback(node, node.deviceId, callback);

    node.hubitat.getMode().then( (mode) => {
      node.currentMode = mode.filter(function(eachMode) {
        return eachMode.active;
      })[0].name;
      console.debug("Mode(" + node.name + "): Status refreshed.  Current mode: " + node.currentMode);
      node.status({fill:"blue", shape:"dot", text:node.currentMode});
    }).catch( err => {
      console.log(err);
      node.status({fill:"red", shape:"dot", text:"Uninitialized"});
    });


    node.on('input', function(msg, send, done) {
      console.debug("HubitatModeNode: Input received");
      console.debug(msg);

      msg.payload = {};
      msg.payload["name"] = "mode";
      msg.payload["value"] = node.currentMode;
      send(msg);

      done();
    });

    node.on('close', function() {
      console.debug("HubitatModeNode: Closed");
      node.hubitat.unregisterCallback(node, callback);
    });
  }

  RED.nodes.registerType("hubitat mode", HubitatModeNode);
}
