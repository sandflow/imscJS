module.exports = function (grunt) {
    // Project configuration.
    grunt.initConfig({
        properties: grunt.file.readJSON('properties.json'),
        pkg: grunt.file.readJSON('package.json'),
        clean: ['<%= properties.webappBuildDir %>'],
        sync: [
            // copy tests
            {expand: true, cwd: '<%= properties.webappTestDir %>', src: '**', dest: '<%= properties.webappBuildDir %>'},

            // copy tests resources
            {expand: true, cwd: '<%= properties.unitTestsResourcesDir %>', src: 'imsc-tests/imsc1/ttml/**', dest: '<%= properties.webappBuildDir %>'},
            {expand: true, cwd: '<%= properties.unitTestsResourcesDir %>', src: 'imsc-tests/imsc1/tests.json', dest: '<%= properties.webappBuildDir %>'},
            {expand: true, cwd: '<%= properties.unitTestsResourcesDir %>', src: 'samples/**', dest: '<%= properties.webappBuildDir %>'},
            {expand: true, cwd: '<%= properties.unitTestsResourcesDir %>', src: 'unit-tests/**', dest: '<%= properties.webappBuildDir %>'}
        ],
        npmcopy: {
            default: {
                files: {
                    '<%= properties.webappBuildDir %>/libs/': [
                        'sax:main',
                        'qunit-assert-close:main',
                        'qunitjs:main',
                        'filesaver.js-npm:main',
                        'jszip/dist/jszip.js'
                    ]
                }
            }
        },
        browserify: {
            default: {
                src: "./src/main/js/main.js",
                dest: "<%= properties.webappBuildDir %>/libs/imsc.js",
                options: {
                    exclude: ["sax"],
                    browserifyOptions: {
                        standalone: 'imsc'
                    }
                }
            }
        },
        jshint: {
            default: {
                src: "src/main/js",
                options: {
                    "-W032": true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-clean');

    grunt.loadNpmTasks('grunt-npmcopy');

    grunt.loadNpmTasks('grunt-browserify');
    
    grunt.loadNpmTasks('grunt-contrib-jshint');
    
    grunt.loadNpmTasks('grunt-sync');

    grunt.registerTask('build', ['jshint', 'sync', 'npmcopy', 'browserify']);
    
    grunt.registerTask('clean', ['clean']);

};
