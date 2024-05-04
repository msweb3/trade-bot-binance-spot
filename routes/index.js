var express = require("express");
var router = express.Router();
const { binanceAPI, binanceSecret } = require("../config");
const { Spot } = require("@binance/connector");

const binanceClient = new Spot(binanceAPI, binanceSecret);

/* GET home page. */
router.get("/", function (req, res, next) {
  res.send("hei");
});

router.post("/execute-trade", async (req, res, next) => {
  try {
    if (
      req.body.includes("[") &&
      req.body.includes("]") &&
      req.body.includes("(") &&
      req.body.includes(")")
    ) {
      const pairs = req.body.split("[")[1].split("]")[0];

      const usdtIndex = pairs.indexOf("USDT");
      const coin = pairs.substring(0, usdtIndex);

      const accountData = await binanceClient.account();

      if (req.body.includes("EMA Trend Up")) {
        const usdtAsset = accountData.data.balances.find((asset) => {
          return asset.asset === "USDT";
        });

        const buyResponse = await binanceClient.newOrder(
          pairs,
          "BUY",
          "MARKET",
          {
            quoteOrderQty: usdtAsset.free,
          }
        );

        console.log(buyResponse.data);
      }

      if (req.body.includes("EMA Trend Down")) {
        const coinAsset = accountData.data.balances.find((asset) => {
          return asset.asset === coin;
        });

        const exchangeInfo = await binanceClient.exchangeInfo();

        const symbol = exchangeInfo.data.symbols.find((symbol) => {
          return symbol.symbol === pairs;
        });

        const stepSize = parseFloat(
          symbol.filters.find((filter) => {
            return filter.filterType === "LOT_SIZE";
          }).stepSize
        );

        function adjustFreeValue(asset, stepSize) {
          // Extract the free value from the asset object
          const freeValue = parseFloat(asset.free);

          // Calculate the number of decimal places
          const decimalPlaces = stepSize.toString().split(".")[1].length;

          // Calculate the adjustment factor based on the step size
          const adjustmentFactor = Math.pow(10, decimalPlaces);

          // Round the free value based on the adjustment factor
          const roundedFreeValue =
            Math.floor(freeValue * adjustmentFactor) / adjustmentFactor;

          return roundedFreeValue;
        }

        // Example usage:
        const asset = coinAsset;
        const adjustedValue = adjustFreeValue(asset, stepSize);

        const sellResponse = await binanceClient.newOrder(
          pairs,
          "SELL",
          "MARKET",
          {
            quantity: adjustedValue,
          }
        );

        console.log(sellResponse.data);
      }

      res.sendStatus(200);
    } else {
      return res.sendStatus(400);
    }
  } catch (error) {
    console.log(error.message);
  }
});

module.exports = router;
