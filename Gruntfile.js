module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    eslint: {
      dist: {
        files: [{
          expand: true,
          cwd: './',
          src: ['trello-json-to-markdown.js', 'get-boards.js']
        }]
      }
    }
  });

  grunt.loadNpmTasks('grunt-eslint');
};
