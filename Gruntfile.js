const babelConfig = require('./babel.config');

module.exports = function (grunt) {

    grunt.initConfig({

            properties: grunt.file.readJSON('properties.json'),

            pkg: grunt.file.readJSON('package.json'),

            clean: ['<%= properties.webappBuildDir %>', '<%= properties.umdBuildDir %>'],

            sync: {
                all: {
                    files:
                        [
                            // copy tests
                            {
                                expand: true,
                                cwd: '<%= properties.webappTestDir %>',
                                src: '**',
                                dest: '<%= properties.webappBuildDir %>'
                            },

                            // copy tests resources
                            {
                                expand: true,
                                cwd: '<%= properties.unitTestsResourcesDir %>',
                                src: 'imsc-tests/imsc1/ttml/**',
                                dest: '<%= properties.webappBuildDir %>'
                            },
                            {
                                expand: true,
                                cwd: '<%= properties.unitTestsResourcesDir %>',
                                src: 'imsc-tests/imsc1/tests.json',
                                dest: '<%= properties.webappBuildDir %>'
                            },
                            {
                                expand: true,
                                cwd: '<%= properties.unitTestsResourcesDir %>',
                                src: 'imsc-tests/imsc1_1/ttml/**',
                                dest: '<%= properties.webappBuildDir %>'
                            },
                            {
                                expand: true,
                                cwd: '<%= properties.unitTestsResourcesDir %>',
                                src: 'imsc-tests/imsc1_1/tests.json',
                                dest: '<%= properties.webappBuildDir %>'
                            },
                            {
                                expand: true,
                                cwd: '<%= properties.unitTestsResourcesDir %>',
                                src: 'unit-tests/**',
                                dest: '<%= properties.webappBuildDir %>'
                            }
                        ]
                },

                release: {
                    src: '<%= properties.umdBuildDir %>/<%= properties.umdMinName %>',
                    dest: '<%= properties.webappBuildDir %>/libs/imsc.js'
                },

                debug: {
                    src: '<%= properties.umdBuildDir %>/<%= properties.umdDebugName %>',
                    dest: '<%= properties.webappBuildDir %>/libs/imsc.js'
                }
            },

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

            browserify: [
                {
                    src: "<%= pkg.main %>",
                    dest: "<%= properties.umdBuildDir %>/<%= properties.umdDebugName %>",
                    options: {
                        transform: [["babelify", babelConfig]],
                        exclude: ["sax"],
                        browserifyOptions: {
                            standalone: 'imsc'
                        }
                    }
                },
                {
                    src: "<%= pkg.main %>",
                    dest: "<%= properties.umdBuildDir %>/<%= properties.umdAllDebugName %>",
                    options: {
                        transform: [["babelify", babelConfig]],
                        browserifyOptions: {
                            standalone: 'imsc'
                        }
                    }
                }
            ],

            eslint: {
                target: "src/main",
            },

            exec: {
                minify:
                    {
                        cmd: [
                            "npx google-closure-compiler --js=<%= properties.umdBuildDir %>/<%= properties.umdAllDebugName %> --js_output_file=<%= properties.umdBuildDir %>/<%= properties.umdAllMinName %>",
                            "npx google-closure-compiler --js=<%= properties.umdBuildDir %>/<%= properties.umdDebugName %> --js_output_file=<%= properties.umdBuildDir %>/<%= properties.umdMinName %>"
                        ].join("&&")
                    }
            }
        }
    );

    grunt.loadNpmTasks('grunt-contrib-clean');

    grunt.loadNpmTasks('grunt-npmcopy');

    grunt.loadNpmTasks('grunt-browserify');

    grunt.loadNpmTasks('grunt-babel');

    grunt.loadNpmTasks('grunt-eslint');

    grunt.loadNpmTasks('grunt-sync');

    grunt.loadNpmTasks('grunt-exec');

    // Register tasks

    grunt.registerTask('build:release', ['eslint', 'browserify', 'exec:minify', 'sync:all', 'sync:release', 'npmcopy']);

    grunt.registerTask('build:debug', ['eslint', 'browserify', 'exec:minify', 'sync:all', 'sync:debug', 'npmcopy']);

    grunt.registerTask('build', ['build:debug']);

    grunt.registerTask('clean', ['clean']);

};
