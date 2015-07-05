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
    this.statusObject = null;

    this.isConnected = false;
    this.bluetoothAddresses = [];
    this.bluetoothSelectedDeviceAddress = '';
    this.bluetoothSelectedDeviceName = '';

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
        _self.bluetoothAddresses.length = 0;    // clear array
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
            if (_self.bluetoothAddresses.indexOf(result.address) >= 0)      // disregard if device already exist
                return;

            var index = _self.bluetoothAddresses.push(result.address) - 1;  // add bluetooth address
            var deviceId = 'device_' + index.toString();

            var itemContent = '<h1>' + result.name + '</h1>' +
                              'RSSI: <span style=\'color:#aa0000\'>' + result.rssi + '</span><br>' +
                              'ADDRESS: <span style=\'color:#aa0000\'>' + result.address + '</span><br>';

            var itemObject = $('<li id=' + deviceId + ' class=\'wrap\'>' + itemContent + '</li><br>');
            var statusObject = $('<span class=\'blink\'></span>');

            itemObject.append(statusObject);
            _self.listviewObj.append(itemObject);

            itemObject.unbind('click');
            itemObject.click(function () {
                _self.selectBluetoothDevice(result.address, result.name, statusObject);
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

    this.selectBluetoothDevice = function (deviceAddress, deviceName, statusObject) {
        navigator.notification.confirm('Connect to ' + deviceName + '?',
            function (result) {
                if (result.buttonIndex == 1) {
                    _self.bluetoothSelectedDeviceAddress = deviceAddress;
                    _self.bluetoothSelectedDeviceName = deviceName; 
                    _self.pin = result.input1;
                    _self.statusObject = statusObject;

                    _self.connectBluetoothDevice ();
                }
            },
            'BLE Connect',
            ['Connect', 'Cancel']);
    }

    this.connectBluetoothDevice = function () {
        var param = { address: _self.bluetoothSelectedDeviceAddress };
        bluetoothle.connect(_self.connectSuccess, _self.connectError, param);
    }

    this.connectSuccess = function (result) {
        switch (result.status) {
            case 'connected':
                _self.isConnected = true;
                _self.statusObject.html('Connected');
                _self.statusObject.css('color', '#009900');
                _self.statusObject.css('font-weight', 'bold');

                var isSent = _self.sendToDevice('CMD+RTT');
                if (isSent) {
                    var r = _self.receiveFromDevice();
                    _self.postMessage('RECEIVED: ' + r);
                }
                break;

            case 'connecting':
                _self.statusObject.html('Connecting ...');
                _self.statusObject.css('font-weight', 'normal');
                _self.statusObject.css('color', '#0000FF');
                break;

            case 'disconnected':
                _self.isConnected = false;
                _self.statusObject.html('Disconnected');
                _self.statusObject.css('font-weight', 'bold');
                _self.statusObject.css('color', '#FF0000');
                break;
        }
    }

    this.connectError = function (result) {
        _self.isConnected = false;
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
            address: _self.bluetoothSelectedDeviceAddress,
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
    }

    this.sendError = function (result) {
        _self.writeResult.error = 1;
        _self.writeResult.status = result.status;
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Receiving 
    // ----------------------------------------------------------------------------------------------------------------

    this.receiveFromDevice = function () {
        var params = {
            address: _self.bluetoothSelectedDeviceAddress,
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
