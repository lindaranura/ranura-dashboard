module.exports = {
  apps: [
    {
      name: "ranura-bot",
      script: "npx.cmd",
      args: "tsx bot.ts"
    },
    {
      name: "ranura-dasbor",
      script: "npm.cmd",
      args: "run dev"
    }
  ]
};
