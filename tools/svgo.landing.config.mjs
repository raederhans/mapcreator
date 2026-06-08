export default {
  multipass: true,
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          collapseGroups: false,
          cleanupIds: false,
          inlineStyles: false,
          minifyStyles: false,
          moveGroupAttrsToElems: false,
          removeHiddenElems: false,
          removeUnknownsAndDefaults: false,
        },
      },
    },
  ],
};
