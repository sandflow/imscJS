if (typeof imscUtils === 'undefined')
    imscUtils = require("../../main/js/utils.js");

QUnit.test("ParseTextShadow",
    function (assert) {

        function shadow(ioff_val, ioff_unit, boff_val, boff_unit, blur_val, blur_unit, color) {
            return [
                {value: ioff_val, unit: ioff_unit},
                {value: boff_val, unit: boff_unit},
                {value: blur_val, unit: blur_unit},
                color
            ]
        }


        var tests = [

            /* four components */

            ["10% -20% 5% lime", [shadow(10, "%", -20, "%", 5, "%", [0, 255, 0, 255])]],
            ["+10% 0% -1% rgba(233,30,99,255)", [shadow(10, "%", 0, "%", -1, "%", [233, 30, 99, 255])]]

         
        ];

        for (var i in tests) {
            assert.deepEqual(
                imscUtils.parseTextShadow(tests[i][0]),
                tests[i][1],
                tests[i][0]
                );
        }
    }
);
