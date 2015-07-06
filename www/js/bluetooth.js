// ----------------------------------------------------------------------------------------------------------------
// Bluetooth (BLE 4.0) using Phonegap Bluetooth LE library
// Author: Jodaryle Factor
// Date: July 4, 2015
// ----------------------------------------------------------------------------------------------------------------

function bluetooth(jqm_listview)
{
    var BLE = { 
        GENERIC_ACCESS: 'FFE0',
        GENERIC_ACCESS_CHARACTERISTIC_RXTX: 'FFE1'
    };

    var _self = this;

    this.listviewObj = jqm_listview;
    this.isScanning = false;
    this.isInitialized = false;

    this.bluetoothDevices = [];
    this.deviceObject = null;

    this.writeResult = {};
    this.readResult = {};

    // ----------------------------------------------------------------------------------------------------------------
    // Helper Functions
    // ----------------------------------------------------------------------------------------------------------------

    this.postMessage = function (msg) {
        navigator.notification.alert(msg, null, 'Notification');
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Bluetooth Initialization
    // ----------------------------------------------------------------------------------------------------------------

    this.init = function () {
        var params = { request: true };
        bluetoothle.initialize(_self.initializeSuccess, _self.initializeError, params);
    }

    this.initializeSuccess = function (result) {
        _self.isInitialized = true;
    }

    this.initializeError = function (result) {
        _self.isInitialized = false;
        _self.postMessage("Initialize Error : " + JSON.stringify(result));
    }

    this.clearDeviceList = function () {
        _self.bluetoothDevices.length = 0;    // clear array
        _self.listviewObj.empty();
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Scanning
    // ----------------------------------------------------------------------------------------------------------------

    this.scan = function () {
        try {
            if (_self.isScanning)
                _self.stopScan();

            _self.clearDeviceList();

            var paramsObj = { serviceUuids: [] };
            bluetoothle.startScan(_self.startScanSuccess, _self.startScanError, paramsObj);
        }
        catch (e) {
            _self.postMessage("Exception: " + e);
        }
    }

    this.startScanSuccess = function (result) {
        if (result.status == 'scanStarted')
        {
            _self.isScanning = true;
            setTimeout(function () {
                _self.stopScan();
            }, 15000);  // if scanning, stop after 30 seconds
        }

        if (result.status = 'scanResult' && result.address != undefined)
        {
            // find device object
            var dev = $.grep(_self.bluetoothDevices, function (e) {
                return e.address == result.address;
            });

            if (dev.length > 0)      // disregard if device already exist
                return;

            var itemContent = '<h1>' + result.name + '</h1>' +
                              'RSSI: <span style=\'color:#aa0000\'>' + result.rssi + '</span><br>' +
                              'ADDRESS: <span style=\'color:#aa0000\'>' + result.address + '</span><br>';

            var itemObject = $('<li class=\'wrap\'>' + itemContent + '</li><br>');
            var statusObject = $('<div></div>');

            // create object
            var device = {
                address: result.address,
                name: result.name,
                rssi: result.rssi,
                statusObject: statusObject,
                itemObject: itemObject,
                isConnected: false
            };

            // add to device array
            _self.bluetoothDevices.push(device);

            // append status object to <li> element
            itemObject.append(statusObject);

            // append <li> element to <ul> listview
            _self.listviewObj.append(itemObject);

            itemObject.unbind('click');
            itemObject.click(function () {
                _self.selectBluetoothDevice(_self.bluetoothDevices.length-1);
            });

            _self.listviewObj.listview('refresh');
        }
    }

    this.startScanError = function (error) {
        _self.postMessage('Start Scan Error : ' + JSON.stringify(error));
    }

    this.stopScan = function () {
        if (_self.isScanning) {
            _self.isScanning = false;
            bluetoothle.stopScan(_self.stopScanSuccess, _self.stopScanError);
        }
    }

    this.stopScanSuccess = function () {
        _self.postMessage('Scanning has stopped!');
    }

    this.stopScanError = function () {
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Connect
    // ----------------------------------------------------------------------------------------------------------------

    this.selectBluetoothDevice = function (deviceIndex) {
        // get the device object
        _self.deviceObject = _self.bluetoothDevices[deviceIndex];

        navigator.notification.confirm('Connect to ' + _self.deviceObject.name + '?',
            function (result) {
                if (result == 1) 
                    _self.connectBluetoothDevice ();
            },
            'BLE Connect',
            'Connect,Cancel');
    }

    this.connectBluetoothDevice = function () {
        var param = { address: _self.deviceObject.address };
        bluetoothle.connect(_self.connectSuccess, _self.connectError, param);
    }

    this.connectSuccess = function (result) {
        switch (result.status) {
            case 'connected':
                _self.deviceObject.statusObject.html('Connected');
                _self.deviceObject.statusObject.css('color', '#009900');
                _self.deviceObject.statusObject.css('font-weight', 'bold');
                _self.deviceObject.isConnected = true;

                _self.deviceObject.itemObject.css('background-color', '#00ff00');

                /*
                var isSent = _self.sendToDevice('CMD+RTT');
                if (isSent) {
                    var r = _self.receiveFromDevice();
                    _self.postMessage('RECEIVED: ' + r);
                }
                */
                break;

            case 'connecting':
                _self.deviceObject.statusObject.html('Connecting ...');
                _self.deviceObject.statusObject.css('font-weight', 'normal');
                _self.deviceObject.statusObject.css('color', '#0000FF');
                break;

            case 'disconnected':
                _self.deviceObject.statusObject.html('Disconnected');
                _self.deviceObject.statusObject.css('font-weight', 'bold');
                _self.deviceObject.statusObject.css('color', '#FF0000');
                _self.deviceObject.isConnected = true;
                break;
        }
    }

    this.connectError = function (result) {
        _self.postMessage("Connect Error : " + JSON.stringify(result));
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Disconnect
    // ----------------------------------------------------------------------------------------------------------------

    this.disconnect = function () {
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Sending 
    // ----------------------------------------------------------------------------------------------------------------

    this.sendToDevice = function (stringMessage) {
        var params = {
            address: _self.deviceObject.address,
            value: bluetoothle.bytesToEncodeString(bluetooth.stringToBytes(stringMessage + '\r\n')),
            serviceUuid: BLE.GENERIC_ACCESS,
            characteristicUuid: BLE.GENERIC_ACCESS_CHARACTERISTIC_RXTX
        };

        _self.writeResult = {
            error: 0,
            status: 'sending', 
            value: ''
        };

        bluetoothle.write(_self.sendSuccess, _self.sendError, params);
        while (_self.writeResult.status == 'sending');
        return _self.writeResult.error == 0 && _self.writeResult.status == 'written';
    }

    this.sendSuccess = function (result) {
        _self.writeResult.error = 0;
        _self.writeResult.status = result.status;
        _self.postMessage('sendSuccess: ' + JSON.stringify(result));
    }

    this.sendError = function (result) {
        _self.writeResult.error = 1;
        _self.writeResult.status = result.status;
        _self.postMessage('sendError: ' + JSON.stringify(result));
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Receiving 
    // ----------------------------------------------------------------------------------------------------------------

    this.receiveFromDevice = function () {
        var params = {
            address: _self.deviceObject.address,
            serviceUuid: BLE.GENERIC_ACCESS,
            characteristicUuid: BLE.GENERIC_ACCESS_CHARACTERISTIC_RXTX
        };

        _self.readResult = {
            error: 0,
            status: 'receiving',
            value: ''
        };

        bluetoothle.read(_self.receiveSuccess, _self.receiveError, params);
        while (_self.readResult.status == 'receiving');
        return _self.readResult.error == 0 && _self.readResult.status == 'read';
    }

    this.receiveSuccess = function (result) {
        _self.readResult.error = 0;
        _self.readResult.value = result.value;
        _self.readResult.status = result.status;
    }

    this.receiveError = function (result) {
        _self.readResult.error = 1;
        _self.readResult.value = '';
        _self.readResult.status = result.status;
    }
}
