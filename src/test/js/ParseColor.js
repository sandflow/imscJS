if (typeof imscUtils === 'undefined')
    imscUtils = require("../../main/js/utils.js");

QUnit.test("ParseColor",
    function (assert) {

        var tests = [
            ["#FFFFFF", [255, 255, 255, 255]],
            ["#FFFFFF7F", [255, 255, 255, 127]],
            ["rgb(255,128,255)", [255, 128, 255, 255]],
            ["rgb( 255, 128 ,   255   )", [255, 128, 255, 255]],
            ["rgba(128,255,255,63)", [128, 255, 255, 63]],
            ["transparent", [0, 0, 0, 0]],
            ["black", [0, 0, 0, 255]],
            ["silver", [0xc0, 0xc0, 0xc0, 255]],
            ["gray", [0x80, 0x80, 0x80, 255]],
            ["white", [255, 255, 255, 255]],
            ["maroon", [0x80, 0, 0, 255]],
            ["red", [255, 0, 0, 255]],
            ["purple", [0x80, 0, 0x80, 255]],
            ["fuchsia", [255, 0, 255, 255]],
            ["magenta", [255, 0, 255, 255]],
            ["green", [0, 0x80, 0, 255]],
            ["lime", [0, 255, 0, 255]],
            ["olive", [0x80, 0x80, 0, 255]],
            ["yellow", [255, 255, 0, 255]],
            ["navy", [0, 0, 0x80, 255]],
            ["blue", [0, 0, 255, 255]],
            ["teal", [0, 0x80, 0x80, 255]],
            ["aqua", [0, 255, 255, 255]],
            ["cyan", [0, 255, 255, 255]],
            ["Cyan", [0, 255, 255, 255]],
            ["CYAN", [0, 255, 255, 255]],
            ["#FFffFF", [255, 255, 255, 255]],
            ["#FfFFFF7f", [255, 255, 255, 127]],
            ["#red", null],
        ];

        for (var i in tests) {
            assert.deepEqual(
                imscUtils.parseColor(tests[i][0]),
                tests[i][1],
                tests[i][0]
                );
        }
    }
);