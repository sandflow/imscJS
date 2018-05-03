if (typeof imscUtils === 'undefined')
    imscUtils = require("../../main/js/utils.js");

QUnit.test("ParsePosition",
    function (assert) {

        function position(h_edge, h_offval, h_offunit, v_edge, v_offval, v_offunit) {
            return {
                h: {edge: h_edge, offset: {value: h_offval, unit: h_offunit}},
                v: {edge: v_edge, offset: {value: v_offval, unit: v_offunit}}
            };
        }

        tests = [

            /* one component */

            ["center", position("left", 50, "%", "top", 50, "%")],
            ["left", position("left", 0, "%", "top", 50, "%")],
            ["right", position("right", 0, "%", "top", 50, "%")],
            ["top", position("left", 50, "%", "top", 0, "%")],
            ["bottom", position("left", 50, "%", "bottom", 0, "%")],
            ["25%", position("left", 25, "%", "top", 50, "%")],

            /* two components */

            ["bottom center", position("left", 50, "%", "bottom", 0, "%")],
            ["bottom left", position("left", 0, "%", "bottom", 0, "%")],
            ["bottom right", position("right", 0, "%", "bottom", 0, "%")],
            /*["bottom 25%", position("left", 0, "%", "top", 50, "%")],*/
            ["center center", position("left", 50, "%", "top", 50, "%")],
            ["center top", position("left", 50, "%", "top", 0, "%")],
            ["center bottom", position("left", 50, "%", "bottom", 0, "%")],
            ["center left", position("left", 0, "%", "top", 50, "%")],
            ["center right", position("right", 0, "%", "top", 50, "%")],
            ["center 33%", position("left", 50, "%", "top", 33, "%")],
            ["left center", position("left", 0, "%", "top", 50, "%")],
            ["left top", position("left", 0, "%", "top", 0, "%")],
            ["left bottom", position("left", 0, "%", "bottom", 0, "%")],
            ["left 45%", position("left", 0, "%", "top", 45, "%")],
            ["right center", position("right", 0, "%", "top", 50, "%")],
            ["right top", position("right", 0, "%", "top", 0, "%")],
            ["right bottom", position("right", 0, "%", "bottom", 0, "%")],
            ["right 20%", position("right", 0, "%", "top", 20, "%")],
            ["top center", position("left", 50, "%", "top", 0, "%")],
            ["top left", position("left", 0, "%", "top", 0, "%")],
            ["top right", position("right", 0, "%", "top", 0, "%")],
            /*["top 75%", position("left", 75, "%", "top", 50, "%")],*/
            ["75% center", position("left", 75, "%", "top", 50, "%")],
            ["75% top", position("left", 75, "%", "top", 0, "%")],
            ["75% bottom", position("left", 75, "%", "bottom", 0, "%")],
            ["75% 75%", position("left", 75, "%", "top", 75, "%")],

            /* three components */

            ["bottom left 1%", position("left", 1, "%", "bottom", 0, "%")],
            ["bottom right 2%", position("right", 2, "%", "bottom", 0, "%")],
            ["bottom 3% center", position("left", 50, "%", "bottom", 3, "%")],
            ["bottom 4% left", position("left", 0, "%", "bottom", 4, "%")],
            ["bottom 5% right", position("right", 0, "%", "bottom", 5, "%")],
            ["center bottom 6%", position("left", 50, "%", "bottom", 6, "%")],
            ["center left 7%", position("left", 7, "%", "top", 50, "%")],
            ["center right 8%", position("right", 8, "%", "top", 50, "%")],
            ["center top 9%", position("left", 50, "%", "top", 9, "%")],
            ["left bottom 10%", position("left", 0, "%", "bottom", 10, "%")],
            ["left top 11%", position("left", 0, "%", "top", 11, "%")],
            ["left 12% bottom", position("left", 12, "%", "bottom", 0, "%")],
            ["left 13% center", position("left", 13, "%", "top", 50, "%")],
            ["left 14% top", position("left", 14, "%", "top", 0, "%")],
            ["right bottom 15%", position("right", 0, "%", "bottom", 15, "%")],
            ["right top 16%", position("right", 0, "%", "top", 16, "%")],
            ["right 17% bottom", position("right", 17, "%", "bottom", 0, "%")],
            ["right 18% center", position("right", 18, "%", "top", 50, "%")],
            ["right 19% top", position("right", 19, "%", "top", 0, "%")],
            ["top left 20%", position("left", 20, "%", "top", 0, "%")],
            ["top right 21%", position("right", 21, "%", "top", 0, "%")],
            ["top 22% center", position("left", 50, "%", "top", 22, "%")],
            ["top 23% left", position("left", 0, "%", "top", 23, "%")],
            ["top 24% right", position("right", 0, "%", "top", 24, "%")],
            
             /* four components */

            ["bottom 25% left 75%", position("left", 75, "%", "bottom", 25, "%")],
            ["bottom 25% right 75%", position("right", 75, "%", "bottom", 25, "%")],
            ["left 25% bottom 75%", position("left", 25, "%", "bottom", 75, "%")],
            ["right 25% bottom 75%", position("right", 25, "%", "bottom", 75, "%")],
            ["top 25% left 75%", position("left", 75, "%", "top", 25, "%")],
            ["top 25% right 75%", position("right", 75, "%", "top", 25, "%")],
            ["left 25% top 75%", position("left", 25, "%", "top", 75, "%")],
            ["right 25% top 75%", position("right", 25, "%", "top", 75, "%")]
        ];

        for (var i in tests) {
            assert.deepEqual(
                imscUtils.parsePosition(tests[i][0]),
                tests[i][1],
                tests[i][0]
                );
        }
    }
);