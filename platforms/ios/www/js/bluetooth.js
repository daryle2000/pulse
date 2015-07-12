// ----------------------------------------------------------------------------------------------------------------
// Bluetooth (BLE 4.0) using Phonegap Bluetooth LE library
// Author: Jodaryle Factor
// Date: July 4, 2015
// ----------------------------------------------------------------------------------------------------------------

var BLE = {
    SERVICE_UUID: 'ffe0',
    CHARACTERISTIC_UUID: 'ffe1',
    STATUS_ERROR: -1,
    STATUS_NOERROR: 0,
    STATUS_NONE: 0,
    STATUS_SENDING: 2,
    STATUS_SENT: 2,
    STATUS_RECEIVING: 3,
    STATUS_RECEIVED: 4,
    STATUS_DISCOVERING: 5,
    STATUS_DISCOVERED: 6,
    STATUS_SUBSCRIBING: 7,
    STATUS_SUBSCRIBED: 8
};

function bluetooth()
{
    try
    {
        var _self = this;

        this.deviceType = '';
        this.connectCallback = null;
        this.listviewObj = null;

        this.isScanning = false;
        this.isInitialized = false;

        this.bluetoothDevices = [];
        this.deviceObject = null;

        // Callback

        this.callbacks = {
            connectCompleted: null,                             // connectCompleted (deviceObject);
            sendCompleted: null,                                // sendCompleted (deviceObject, writeResult); 
            receiveCompleted: null,                             // receiveCompleted (deviceObject, readResult);
            dataArrival: null,                                  // dataArrival (deviceObject, subscriptionResult, writeResult);
            closeCompleted: null                                // closeCompleted (deviceObject);
        };

        this.errorResult = {
            error: 0,
            errorTask: '',
            errorDescription: ''
        };

        this.writeResult = {
            status: BLE.STATUS_NONE,
            value: ''
        };

        this.readResult = {
            status: BLE.STATUS_NONE,
            value: ''
        };

        this.subscriptionResult = {
            status: BLE.STATUS_NONE,
            value: ''
        };

        // ----------------------------------------------------------------------------------------------------------------
        // Helper Functions
        // ----------------------------------------------------------------------------------------------------------------

        this.postMessage = function (msg) {
            navigator.notification.alert(msg, null, 'Notification');
        }

        this.clearDeviceList = function () {
            _self.bluetoothDevices.length = 0;    // clear array
            _self.listviewObj.empty();
        }

        this.clearCurrentDeviceStatus = function () {
            if (_self.deviceObject != null || !isNaN(_self.deviceObject)) {
                _self.deviceObject.isConnected = false;
                _self.deviceObject.isDiscovered = false;
                _self.deviceObject.isSubscribed = false;
            }
        }

        this.errorHandler = function (result) {
            _self.errorResult.error = 1;
            _self.errorResult.errorTask = result.error;
            _self.errorResult.errorDescription = result.message;

            _self.postMessage(JSON.stringify(error));
        }

        this.clearError = function () {
            _self.errorResult.error = 0;
            _self.errorResult.errorTask = '';
            _self.errorResult.errorDescription = '';
        }

        this.raiseError = function (owner, message) {
            _self.errorHandler({ error: owner, message: message });
        }

        // ----------------------------------------------------------------------------------------------------------------
        // Bluetooth Initialization
        // ----------------------------------------------------------------------------------------------------------------

        this.init = function () {
            try
            {
                var params = { request: true };
                bluetoothle.initialize(_self.initializeSuccess, _self.initializeError, params);
            }
            catch (e)
            {
                _self.raiseError('init', e);
            }
        }

        this.initializeSuccess = function (result) {
            _self.isInitialized = true;
        }

        this.initializeError = function (result) {
            _self.isInitialized = false;
            _self.errorHandler(result);
        }

        // ----------------------------------------------------------------------------------------------------------------
        // Scanning
        // ----------------------------------------------------------------------------------------------------------------

        this.scanDevices = function () {
            try {
                if (_self.isScanning)
                    _self.stopScan();

                _self.clearDeviceList();

                var paramsObj = { serviceUuids: [] };
                bluetoothle.startScan(_self.startScanSuccess, _self.errorHandler, paramsObj);
            }
            catch (e) {
                _self.raiseError('scanDevices', e);
            }
        }

        this.startScanSuccess = function (result) {
            try
            {
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
                    itemObject.append ($('<span>Status Here</span>'));

                    // append <li> element to <ul> listview
                    _self.listviewObj.append(itemObject);

                    // create object
                    var device = {
                        address: result.address,
                        name: result.name,
                        rssi: result.rssi,
                        itemObject: itemObject,
                        statusObject: null,
                        isConnected: false,
                        isDiscovered: false,
                        isSubscribed: false
                    };

                    // add to device array
                    _self.bluetoothDevices.push(device);

                    itemObject.unbind('click');
                    itemObject.click(function () {
                        _self.selectBluetoothDevice(_self.bluetoothDevices.length-1);
                    });

                    _self.listviewObj.listview('refresh');
                }
            }
            catch (e)
            {
                _self.raiseError('startScanSuccess', e);
            }
        }

        this.stopScan = function () {
            if (_self.isScanning) {
                _self.isScanning = false;
                bluetoothle.stopScan(_self.stopScanSuccess, _self.stopScanError);
            }
        }

        this.stopScanSuccess = function () {
            //_self.postMessage('Scanning has stopped!');
        }

        // ----------------------------------------------------------------------------------------------------------------
        // Connect
        // ----------------------------------------------------------------------------------------------------------------

        this.selectBluetoothDevice = function (deviceIndex) {
            try
            {
                _self.deviceObject = _self.bluetoothDevices[deviceIndex];

                navigator.notification.confirm('Connect to ' + _self.deviceObject.name + '?',
                    function (result) {
                        if (result == 1) {
                            // Clear device status and error
                            _self.clearError();
                            _self.clearCurrentDeviceStatus();

                            // connect to current selected device
                            _self.connectToBluetoothDevice();
                        }
                    },
                    'BLE Connect',
                    'Connect,Cancel');
            }
            catch (e) {
                _self.raiseError('selectBluetoothDevice', e);
            }
        }

        this.connectToBluetoothDevice = function () {
            var param = { address: _self.deviceObject.address };
            bluetoothle.connect(_self.connectSuccess, _self.errorHandler, param);
        }

        this.connectSuccess = function (result) {
            switch (result.status) {
                case 'connected':
                    _self.deviceObject.isConnected = true;
                    _self.deviceObject.statusObject.text('Discovering Services ...');
                    _self.discoverServices();
                    break;

                case 'connecting':
                    _self.deviceObject.itemObject.css('background-color', '#ffffaa');
                    _self.deviceObject.statusObject.text('Connecting ...');
                    break;

                case 'disconnected':
                    _self.deviceObject.itemObject.css('background-color', '#ff5555');
                    _self.deviceObject.isConnected = false;
                    _self.deviceObject.isDiscovered = false;
                    _self.deviceObject.isSubscribed = false;
                    break;
            }
        }

        // ----------------------------------------------------------------------------------------------------------------
        // Discover
        // ----------------------------------------------------------------------------------------------------------------

        this.discoverServices = function () {
            var params;
            switch (_self.deviceType)
            {
                case DEVICE_TYPE.ANDROID:
                    params = { address: _self.deviceObject.address };
                    bluetoothle.discover(_self.discoverServicesSuccess, _self.errorHandler, params);
                    break;

                case DEVICE_TYPE.IPHONE:
                case DEVICE_TYPE.IPAD:
                    params = { 
                        address: _self.deviceObject.address, 
                        serviceUuids: [BLE.SERVICE_UUID]
                    };
                    bluetoothle.services(_self.servicesSuccess, _self.errorHandler, params);
                    break;
            }
        }

        // ----------------------------------------------------------------------------------------------------------------
        // Discover ANDROID
        // ----------------------------------------------------------------------------------------------------------------
        this.discoverServicesSuccess = function (result) {
            _self.deviceObject.isDiscovered = true;
            _self.subscribe();
        }

        // ----------------------------------------------------------------------------------------------------------------
        // Discover iOS
        // ----------------------------------------------------------------------------------------------------------------

        this.servicesSuccess = function (result) {
            var params = {
                address: _self.deviceObject.address,
                serviceUuid: BLE.SERVICE_UUID,
                characteristicUuids: [BLE.CHARACTERISTIC_UUID]
            };

            bluetoothle.characteristics(_self.characteristicsSuccess, _self.errorHandler, params);
        }

        this.characteristicsSuccess = function (result) {
            var params = {
                address: _self.deviceObject.address,
                serviceUuid: BLE.SERVICE_UUID,
                characteristicUuid: BLE.CHARACTERISTIC_UUID
            };

            bluetoothle.descriptors(_self.descriptorsSuccess, _self.errorHandler, params);
        }

        this.descriptorsSuccess = function (result) {
            _self.deviceObject.isDiscovered = true;
            _self.subscribe();
        }

        // ----------------------------------------------------------------------------------------------------------------
        // Subscribe
        // ----------------------------------------------------------------------------------------------------------------

        this.subscribe = function () {
            _self.deviceObject.statusObject.text('Connected');
            _self.deviceObject.itemObject.css('background-color', '#99ff99');

            var params = {
                address: _self.deviceObject.address,
                serviceUuid: BLE.SERVICE_UUID,
                characteristicUuid: BLE.CHARACTERISTIC_UUID,
                isNotification: true
            };

            _self.subscriptionResult.status = BLE.STATUS_SUBSCRIBING;
            _self.subscriptionResult.value = '';

            bluetoothle.subscribe(_self.subscribeSuccess, _self.errorHandler, params);
        }

        this.subscribeSuccess = function (result) {
            switch (result.status) {
                case 'subscribed':
                    _self.subscriptionResult.status = BLE.STATUS_SUBSCRIBED;
                    _self.deviceObject.isSubscribed = true;

                    if (_self.callbacks.connectCompleted != null)
                        _self.callbacks.connectCompleted(_self.deviceObject);

                    break;

                case 'subscribedResult':
                    _self.subscriptionResult.value = bluetoothle.bytesToString(bluetoothle.encodedStringToBytes(result.value));
                    if (_self.callbacks.dataArrival != null)
                        _self.callbacks.dataArrival (_self.deviceObject, _self.subscriptionResult, _self.writeResult);
                    break;
            }
        }

        // ----------------------------------------------------------------------------------------------------------------
        // Disconnect
        // ----------------------------------------------------------------------------------------------------------------

        this.disconnectDevice = function () {
            var params = { address: _self.deviceObject.address };
            bluetoothle.disconnect(_self.disconnectSuccess, _self.errorHandler, params);
        }

        this.disconnectSuccess = function (result) {
            switch (result.status) {
                case 'disconnected':
                    _self.clearCurrentDeviceStatus();

                    var params = { address: _self.deviceObject.address };
                    bluetoothle.close(_self.closeSuccess, _self.errorHandler, params);
                    break;

                case 'disconnecting':
                    break;
            }
        }

        this.closeSuccess = function (result) {
            if (_self.callbacks.closeCompleted != null)
                _self.callbacks.closeCompleted (_self.deviceObject);
        }

        // ----------------------------------------------------------------------------------------------------------------
        // Sending 
        // ----------------------------------------------------------------------------------------------------------------

        this.sendToDevice = function (stringMessage) {
            try
            {
                var params = {
                    address: _self.deviceObject.address,
                    value: bluetoothle.bytesToEncodedString(bluetoothle.stringToBytes(stringMessage + '\r\n')),
                    serviceUuid: BLE.SERVICE_UUID,
                    characteristicUuid: BLE.CHARACTERISTIC_UUID
                };
            
                _self.clearError();

                _self.writeResult.status = BLE.STATUS_SENDING;
                _self.writeResult.value = stringMessage;

                bluetoothle.write(_self.sendSuccess, _self.sendError, params);
            }
            catch (e) {
                _self.raiseError('sendToDevice', e);
            }
        }

        this.sendSuccess = function (result) {
            if (result.status == 'written') {
                _self.writeResult.status = BLE.STATUS_SENT;
                if (_self.callbacks.sendCompleted != null)
                    _self.callbacks.sendCompleted (_self.deviceObject, _self.writeResult);
            }
        }

        this.sendError = function (result) {
            _self.writeResult.stutus = BLE.STATUS_ERROR;
            _self.errorHandler(result);
        }

        // ----------------------------------------------------------------------------------------------------------------
        // Receiving 
        // ----------------------------------------------------------------------------------------------------------------

        this.receiveFromDevice = function () {
            try
            {
                var params = {
                    address: _self.deviceObject.address,
                    serviceUuid: BLE.SERVICE_UUID,
                    characteristicUuid: BLE.CHARACTERISTIC_UUID
                };

                _self.clearError();

                _self.readResult.status = BLE.STATUS_RECEIVING;
                _self.readResult.value = '';

                bluetoothle.read(_self.receiveSuccess, _self.receiveError, params);
            }
            catch (e) {
                _self.raiseError('receiveFromDevice', e);
            }
        }

        this.receiveSuccess = function (result) {
            _self.postMessage('receiveSuccess: ' + JSON.stringify(result));

            try
            {
                if (result.status == 'read')
                {
                    _self.readResult.status = BLE.STATUS_RECEIVED;
                    _self.readResult.value = bluetoothle.bytesToString(bluetoothle.encodedStringToBytes(result.value));

                    if (_self.callbacks.receiveCompleted != null)
                        _self.callbacks.receiveCompleted (_self.deviceObject, _self.readResult);
                }
            }
            catch (e) {
                _self.raiseError('receiveSuccess', e);
            }
        }

        this.receiveError = function (result) {
            _self.writeResult.stutus = BLE.STATUS_ERROR;
            _self.errorHandler(result);
        }
    }
    catch (e) {
        navigator.notification.alert(e, null, 'bluetooth class');
    }
}
