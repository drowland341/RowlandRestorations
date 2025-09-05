module.exports = function (eleventyConfig) {
  // copy assets straight through to the output
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // collection: all markdown files in src/projects, newest first
  eleventyConfig.addCollection("projects", (collection) =>
    collection.getFilteredByGlob("src/projects/*.md").sort((a, b) => b.date - a.date)
  );

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};
