const {DateTime} = require("luxon")
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const markdownIt = require("markdown-it");
module.exports = function(eleventyConfig) {

  eleventyConfig.addPassthroughCopy("./src/styles.css");
  eleventyConfig.addPassthroughCopy("./src/blog.css");
  eleventyConfig.addPassthroughCopy("./src/code.css");
  eleventyConfig.addPassthroughCopy("./src/quotes.js");
  eleventyConfig.addPassthroughCopy({"./images/favicon.png": "/favicon.png" });  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPassthroughCopy({"./images/engine.gif": "/engine.gif" });  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPassthroughCopy({"./images/hacker.gif": "/hacker.gif" });  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPassthroughCopy({"./images/catgame.gif": "/catgame.gif" });  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPassthroughCopy({"./images/Spaceinvaders.gif": "/Spaceinvaders.gif" });  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPassthroughCopy({"./images/bullethell.gif": "/bullethell.gif" });  eleventyConfig.addPlugin(syntaxHighlight);

  let options = {
		html: true,
		breaks: true,
		linkify: true,
	};
  var md = require('markdown-it')(),
  mathjax3 = require('markdown-it-mathjax3');
  footnotes = require('markdown-it-footnote');
  md.use(mathjax3);

  eleventyConfig.setLibrary("md", markdownIt(options).use(mathjax3).use(footnotes));
  eleventyConfig.addFilter("PostDate", (dateobj) => {return DateTime.fromJSDate(dateobj).toLocaleString(DateTime.DATE_MED)})
  return {
    dir: {
      input: "src",
      output: "_site"
    }
  }
};
