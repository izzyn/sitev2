const {DateTime} = require("luxon")
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
module.exports = function(eleventyConfig) {

  eleventyConfig.addPassthroughCopy("./src/styles.css");
  eleventyConfig.addPassthroughCopy("./src/blog.css");
  eleventyConfig.addPassthroughCopy("./src/code.css");
  eleventyConfig.addPlugin(syntaxHighlight);

  eleventyConfig.addFilter("PostDate", (dateobj) => {return DateTime.fromJSDate(dateobj).toLocaleString(DateTime.DATE_MED)})
  return {
    dir: {
      input: "src",
      output: "_site"
    }
  }
};
