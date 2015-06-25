function bluetooth(jqm_listview) 
{
    var _self = this;
    this.listviewObj = jqm_listview;

    this.postMessage = function (msg) {
        alert(msg);
    }

    this.init = function () {
    }

    this.scan = function () {
        try {
            bluetoothSerial.list(_self.listSuccess, _self.listError);
        }
        catch (e) {
            _self.postMessage("Exception: " + e);
        }
    }

    this.listSuccess = function (result) {
        var itemToAdd;
        var itemContent;
        var itemHandler;

        _self.listviewObj.empty()

        for (var idx = 0; idx < result.length; idx++) {
            itemContent = '<h1>' + result[idx].name + '</h1><br>' + '<span style="color:#aa0000">' + result[idx].id + '</span>';
            itemHandler = 'alert("' + result[idx].id + '");';
            itemToAdd = '<li onclick=' + itemHandler + '>' + itemContent + '</li>';
            _self.listviewObj.append(itemToAdd);
        }

        _self.listviewObj.listview('refresh');
    }

    this.listError = function (error) {
        _self.postMessage ('BT List Error!!!');
    }
}
