/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var DEVICE_TYPE = {
    IPAD: 'ipad',
    IPHONE: 'iphone',
    ANDROID: 'android',
    BLACKBERRY: 'blackBerry',
    UNDETECTED: 'undetected'
};

function application() {
    this.bluetoothObj = null;

    this.isRunning = false;
    this.executeLabelObj = $('#executeLabel');
    this.executeMessageObj = $('#executeMessage');
    this.deviceType = '';

    var _self = this;
    
    this.initialize = function () {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    }

    this.onDeviceReady = function () {
        try
        {
            _self.updateStatus();

            _self.deviceType = _self.getDeviceType();

            _self.bluetoothObj = new bluetooth($('#connectListView'), _self.deviceType);
            _self.bluetoothObj.init();

            // Event when Connect item is clicked
            $(document).on('pageshow', '#connectPage', function (event, ui) {
                _self.onConnectPageLoad();
            });

            // Event when Connect page is closing
            $(document).on('pagehide', '#connectPage', function (event, ui) {
                _self.stopScanningDevices();

            });

            StatusBar.show();
            StatusBar.overlaysWebView(false);
            StatusBar.backgroundColorByHexString("#4444ff");
        }
        catch (e) {
            _self.bluetoothObj.postMessage(e);
        }
    }

    this.updateStatus = function () {
        // ---
        // update clock/time
        // ---
        var statClockObj = $('#clock');
        statClockObj.html(_self.getDate() + ' ' + _self.getTime() + ' (Runtime hh:mm)');

        // ---
        // update schedule status
        // ---
        _self.executeUpdateDisplay();
    }

    this.onConnectPageLoad = function () {
        alert('onConnectPageLoad');
        _self.scanDevices();
    }

    // -------------------------------------------------------------------------------------------
    // Bluetooth Functions
    // -------------------------------------------------------------------------------------------

    this.scanDevices = function () {
        alert('scanDevices');
        _self.bluetoothObj.scanDevices();
    }

    this.stopScanningDevices = function () {
        _self.bluetoothObj.stopScan();
    }

    // -------------------------------------------------------------------------------------------
    // Sprinkler Functions
    // -------------------------------------------------------------------------------------------
    this.executeMode = function () {
        if (_self.isRunning)
            _self.stop();
        else
            _self.run();

        _self.executeUpdateDisplay();
    }

    this.run = function () {
        _self.isRunning = true;
        // run here
    }

    this.stop = function () {
        _self.isRunning = false;
        // stop here
    }

    this.executeUpdateDisplay = function () {
        _self.executeLabelObj.css('font-size', '30px');

        if (_self.isRunning) {
            _self.executeLabelObj.css('color', '#bb0000');
            _self.executeLabelObj.html('STOP');
            _self.executeMessageObj.html('Sprinkler is currently running. Stop sprinkler from running saved schedules.');
        }
        else {
            _self.executeLabelObj.css('color', '#009900');
            _self.executeLabelObj.html('RUN');
            _self.executeMessageObj.html('Sprinkler is current stopped. Run/Monitor sprinkler schedules.');
        }
    }

    // -------------------------------------------------------------------------------------------
    // Essential Functions
    // -------------------------------------------------------------------------------------------

    this.getDate = function () {
        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth() + 1; 

        var yyyy = today.getFullYear();
        if (dd < 10)
            dd = '0' + dd;
        if (mm < 10)
            mm = '0' + mm;

        return mm + '-' + dd + '-' + yyyy;
    }

    this.getTime = function () {
        var now = new Date();
        var hrs = now.getHours();
        var min = now.getMinutes();

        if (hrs < 10)
            hrs = '0' + hrs;

        if (min < 10)
            min = '0' + min;

        return hrs + ':' + min;
    }

    this.getDeviceType = function () {
        if (navigator.userAgent.match(/iPad/i) == "iPad")
            return DEVICE_TYPE.IPAD;
        
        if (navigator.userAgent.match(/iPhone/i) == "iPhone")
            return DEVICE_TYPE.IPHONE;

        if (navigator.userAgent.match(/Android/i) == "Android")
            return DEVICE_TYPE.ANDROID;

        if (navigator.userAgent.match(/BlackBerry/i) == "BlackBerry")
            return DEVICE_TYPE.BLACKBERRY;

        return DEVICE_TYPE.UNDETECTED;
    }
}