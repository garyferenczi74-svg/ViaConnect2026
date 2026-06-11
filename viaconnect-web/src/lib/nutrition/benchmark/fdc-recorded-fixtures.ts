// Prompt 186 Phase 4: REAL FoodData Central responses recorded on
// 2026-06-11 (slimmed to the fields the engine reads). The golden-meal
// regression suite routes fetch() through these so the REAL mapping,
// ranking, portion, and scaling code runs with zero live API calls.
// Regenerate with: node tmp/186/build-fixture-module.mjs (records live
// FDC responses; never hand-edit nutrient values).
//
// Searches recorded with dataType Foundation, SR Legacy, Survey (FNDDS),
// pageSize 25. Details via /food/{fdcId}.

/* eslint-disable */
export const FDC_RECORDED_SEARCHES: Record<string, { totalHits: number; foods: Array<{ fdcId: number; description: string; dataType?: string; score?: number }> }> = {
  "apple": {
    "totalHits": 137,
    "foods": [
      {
        "fdcId": 2709294,
        "description": "Apple, candied",
        "dataType": "Survey (FNDDS)",
        "score": 295.39032
      },
      {
        "fdcId": 2709215,
        "description": "Apple, raw",
        "dataType": "Survey (FNDDS)",
        "score": 295.39032
      },
      {
        "fdcId": 2709196,
        "description": "Apple, dried",
        "dataType": "Survey (FNDDS)",
        "score": 287.57837
      },
      {
        "fdcId": 2708023,
        "description": "Crisp, apple",
        "dataType": "Survey (FNDDS)",
        "score": 283.3944
      },
      {
        "fdcId": 2709220,
        "description": "Apple, baked",
        "dataType": "Survey (FNDDS)",
        "score": 281.91534
      },
      {
        "fdcId": 2709319,
        "description": "Apple cider",
        "dataType": "Survey (FNDDS)",
        "score": 279.50967
      },
      {
        "fdcId": 2708019,
        "description": "Cobbler, apple",
        "dataType": "Survey (FNDDS)",
        "score": 272.69324
      },
      {
        "fdcId": 174988,
        "description": "Croissants, apple",
        "dataType": "SR Legacy",
        "score": 272.69324
      },
      {
        "fdcId": 2707995,
        "description": "Pie, apple",
        "dataType": "Survey (FNDDS)",
        "score": 272.69324
      },
      {
        "fdcId": 2708039,
        "description": "Strudel, apple",
        "dataType": "Survey (FNDDS)",
        "score": 272.69324
      },
      {
        "fdcId": 175032,
        "description": "Strudel, apple",
        "dataType": "SR Legacy",
        "score": 272.69324
      },
      {
        "fdcId": 2709219,
        "description": "Apple pie filling",
        "dataType": "Survey (FNDDS)",
        "score": 269.60306
      },
      {
        "fdcId": 2709320,
        "description": "Apple juice, 100%",
        "dataType": "Survey (FNDDS)",
        "score": 268.51913
      },
      {
        "fdcId": 2709293,
        "description": "Apple salad with dressing",
        "dataType": "Survey (FNDDS)",
        "score": 258.0884
      },
      {
        "fdcId": 170959,
        "description": "Babyfood, juice, apple",
        "dataType": "SR Legacy",
        "score": 249.23532
      },
      {
        "fdcId": 2707855,
        "description": "Cake or cupcake, apple",
        "dataType": "Survey (FNDDS)",
        "score": 249.23532
      },
      {
        "fdcId": 168816,
        "description": "Fruit butters, apple",
        "dataType": "SR Legacy",
        "score": 249.23532
      },
      {
        "fdcId": 168171,
        "description": "Rose-apples, raw",
        "dataType": "SR Legacy",
        "score": 249.23532
      },
      {
        "fdcId": 2709374,
        "description": "Baby Toddler juice, apple",
        "dataType": "Survey (FNDDS)",
        "score": 243.62021
      },
      {
        "fdcId": 2709662,
        "description": "Carrots, raw, salad with apples",
        "dataType": "Survey (FNDDS)",
        "score": 241.05418
      },
      {
        "fdcId": 2707996,
        "description": "Pie, apple, fast food",
        "dataType": "Survey (FNDDS)",
        "score": 241.05418
      },
      {
        "fdcId": 2709321,
        "description": "Apple juice, 100%, with calcium added",
        "dataType": "Survey (FNDDS)",
        "score": 231.81879
      },
      {
        "fdcId": 171691,
        "description": "Apples, dried, sulfured, uncooked",
        "dataType": "SR Legacy",
        "score": 229.5062
      },
      {
        "fdcId": 1750340,
        "description": "Apples, fuji, with skin, raw",
        "dataType": "Foundation",
        "score": 229.5062
      },
      {
        "fdcId": 1750341,
        "description": "Apples, gala, with skin, raw",
        "dataType": "Foundation",
        "score": 229.5062
      },
      {
        "fdcId": 1750343,
        "description": "Apples, honeycrisp, with skin, raw",
        "dataType": "Foundation",
        "score": 229.5062
      },
      {
        "fdcId": 171689,
        "description": "Apples, raw, without skin",
        "dataType": "SR Legacy",
        "score": 229.5062
      },
      {
        "fdcId": 171351,
        "description": "Babyfood, apple-banana juice",
        "dataType": "SR Legacy",
        "score": 229.5062
      },
      {
        "fdcId": 173517,
        "description": "Babyfood, apples with ham, strained",
        "dataType": "SR Legacy",
        "score": 229.5062
      },
      {
        "fdcId": 173511,
        "description": "Babyfood, apples, dices, toddler",
        "dataType": "SR Legacy",
        "score": 229.5062
      },
      {
        "fdcId": 167729,
        "description": "Babyfood, juice, apple - cherry",
        "dataType": "SR Legacy",
        "score": 229.5062
      },
      {
        "fdcId": 171381,
        "description": "Babyfood, juice, apple and grape",
        "dataType": "SR Legacy",
        "score": 229.5062
      },
      {
        "fdcId": 171352,
        "description": "Babyfood, juice, apple and peach",
        "dataType": "SR Legacy",
        "score": 229.5062
      },
      {
        "fdcId": 171353,
        "description": "Babyfood, juice, apple and prune",
        "dataType": "SR Legacy",
        "score": 229.5062
      },
      {
        "fdcId": 170985,
        "description": "Babyfood, juice, apple, with calcium",
        "dataType": "SR Legacy",
        "score": 229.5062
      },
      {
        "fdcId": 171355,
        "description": "Babyfood, juice, orange and apple",
        "dataType": "SR Legacy",
        "score": 229.5062
      },
      {
        "fdcId": 167728,
        "description": "Babyfood, rice and apples, dry",
        "dataType": "SR Legacy",
        "score": 229.5062
      },
      {
        "fdcId": 169909,
        "description": "Mammy-apple, (mamey), raw",
        "dataType": "SR Legacy",
        "score": 229.5062
      },
      {
        "fdcId": 168822,
        "description": "Pie fillings, apple, canned",
        "dataType": "SR Legacy",
        "score": 229.5062
      },
      {
        "fdcId": 168175,
        "description": "Sugar-apples, (sweetsop), raw",
        "dataType": "SR Legacy",
        "score": 229.5062
      },
      {
        "fdcId": 1750342,
        "description": "Apples, granny smith, with skin, raw",
        "dataType": "Foundation",
        "score": 212.68224
      },
      {
        "fdcId": 168202,
        "description": "Apples, raw, golden delicious, with skin",
        "dataType": "SR Legacy",
        "score": 212.68224
      },
      {
        "fdcId": 1750339,
        "description": "Apples, red delicious, with skin, raw",
        "dataType": "Foundation",
        "score": 212.68224
      },
      {
        "fdcId": 2709363,
        "description": "Baby Toddler apples, Stage 1",
        "dataType": "Survey (FNDDS)",
        "score": 212.68224
      },
      {
        "fdcId": 2709364,
        "description": "Baby Toddler apples, Stage 2",
        "dataType": "Survey (FNDDS)",
        "score": 212.68224
      },
      {
        "fdcId": 167690,
        "description": "Babyfood, apple yogurt dessert, strained",
        "dataType": "SR Legacy",
        "score": 212.68224
      },
      {
        "fdcId": 167733,
        "description": "Babyfood, banana apple dessert, strained",
        "dataType": "SR Legacy",
        "score": 212.68224
      },
      {
        "fdcId": 170977,
        "description": "Babyfood, dessert, dutch apple, junior",
        "dataType": "SR Legacy",
        "score": 212.68224
      },
      {
        "fdcId": 170976,
        "description": "Babyfood, dessert, dutch apple, strained",
        "dataType": "SR Legacy",
        "score": 212.68224
      },
      {
        "fdcId": 172287,
        "description": "Babyfood, dinner, apples and chicken, strained",
        "dataType": "SR Legacy",
        "score": 212.68224
      }
    ]
  },
  "avocado": {
    "totalHits": 12,
    "foods": [
      {
        "fdcId": 2710208,
        "description": "Avocado dressing",
        "dataType": "Survey (FNDDS)",
        "score": 441.56403
      },
      {
        "fdcId": 2709223,
        "description": "Avocado, raw",
        "dataType": "Survey (FNDDS)",
        "score": 441.56403
      },
      {
        "fdcId": 173573,
        "description": "Oil, avocado",
        "dataType": "SR Legacy",
        "score": 441.56403
      },
      {
        "fdcId": 2710248,
        "description": "Avocado, for use on a sandwich",
        "dataType": "Survey (FNDDS)",
        "score": 403.52588
      },
      {
        "fdcId": 171706,
        "description": "Avocados, raw, California",
        "dataType": "SR Legacy",
        "score": 403.52588
      },
      {
        "fdcId": 171707,
        "description": "Avocados, raw, Florida",
        "dataType": "SR Legacy",
        "score": 403.52588
      },
      {
        "fdcId": 2708960,
        "description": "Sushi roll, avocado",
        "dataType": "Survey (FNDDS)",
        "score": 403.52588
      },
      {
        "fdcId": 2710824,
        "description": "Avocado, Hass, peeled, raw",
        "dataType": "Foundation",
        "score": 371.53412
      },
      {
        "fdcId": 171705,
        "description": "Avocados, raw, all commercial varieties",
        "dataType": "SR Legacy",
        "score": 344.25323
      },
      {
        "fdcId": 2709824,
        "description": "Lettuce, salad with avocado, tomato, and/or carrots, with or without other vegetables, no dressing",
        "dataType": "Survey (FNDDS)",
        "score": 266.162
      },
      {
        "fdcId": 2709308,
        "description": "Guacamole with tomatoes",
        "dataType": "Survey (FNDDS)",
        "score": 29.36893
      },
      {
        "fdcId": 2709307,
        "description": "Guacamole, NFS",
        "dataType": "Survey (FNDDS)",
        "score": 23.875637
      }
    ]
  },
  "cheerio": {
    "totalHits": 275,
    "foods": [
      {
        "fdcId": 2517161,
        "description": "Cheerios Cereal",
        "dataType": "Branded",
        "score": 29.424736
      },
      {
        "fdcId": 2738631,
        "description": "Cheerios Cereal",
        "dataType": "Branded",
        "score": 29.424736
      },
      {
        "fdcId": 759418,
        "description": "Cheerios Cereal",
        "dataType": "Branded",
        "score": 29.424736
      },
      {
        "fdcId": 1462106,
        "description": "Blueberry Cheerios Cereal",
        "dataType": "Branded",
        "score": -17.050102
      },
      {
        "fdcId": 2233830,
        "description": "Blueberry Cheerios Cereal",
        "dataType": "Branded",
        "score": -17.050102
      }
    ]
  },
  "egg": {
    "totalHits": 666,
    "foods": [
      {
        "fdcId": 747997,
        "description": "Eggs, Grade A, Large, egg white",
        "dataType": "Foundation",
        "score": 338.33563
      },
      {
        "fdcId": 748967,
        "description": "Eggs, Grade A, Large, egg whole",
        "dataType": "Foundation",
        "score": 338.33563
      },
      {
        "fdcId": 748236,
        "description": "Eggs, Grade A, Large, egg yolk",
        "dataType": "Foundation",
        "score": 338.33563
      },
      {
        "fdcId": 2707180,
        "description": "Egg, Benedict",
        "dataType": "Survey (FNDDS)",
        "score": 322.80188
      },
      {
        "fdcId": 2707179,
        "description": "Egg, creamed",
        "dataType": "Survey (FNDDS)",
        "score": 322.80188
      },
      {
        "fdcId": 2707181,
        "description": "Egg, deviled",
        "dataType": "Survey (FNDDS)",
        "score": 322.80188
      },
      {
        "fdcId": 174901,
        "description": "Bagels, egg",
        "dataType": "SR Legacy",
        "score": 322.70755
      },
      {
        "fdcId": 172673,
        "description": "Bread, egg",
        "dataType": "SR Legacy",
        "score": 322.70755
      },
      {
        "fdcId": 2708984,
        "description": "Congee, with egg",
        "dataType": "Survey (FNDDS)",
        "score": 322.70755
      },
      {
        "fdcId": 2707343,
        "description": "Egg burrito",
        "dataType": "Survey (FNDDS)",
        "score": 322.70755
      },
      {
        "fdcId": 2708597,
        "description": "Quesadilla, egg",
        "dataType": "Survey (FNDDS)",
        "score": 322.70755
      },
      {
        "fdcId": 2708602,
        "description": "Taquito, egg",
        "dataType": "Survey (FNDDS)",
        "score": 322.70755
      },
      {
        "fdcId": 2707201,
        "description": "Egg omelet or scrambled egg, made with butter",
        "dataType": "Survey (FNDDS)",
        "score": 322.51157
      },
      {
        "fdcId": 2707199,
        "description": "Egg omelet or scrambled egg, made with margarine",
        "dataType": "Survey (FNDDS)",
        "score": 322.51157
      },
      {
        "fdcId": 2707200,
        "description": "Egg omelet or scrambled egg, made with oil",
        "dataType": "Survey (FNDDS)",
        "score": 322.51157
      },
      {
        "fdcId": 2707205,
        "description": "Egg omelet or scrambled egg, no added fat",
        "dataType": "Survey (FNDDS)",
        "score": 322.51157
      },
      {
        "fdcId": 2707198,
        "description": "Egg omelet or scrambled egg, NS as to fat",
        "dataType": "Survey (FNDDS)",
        "score": 322.51157
      },
      {
        "fdcId": 2708972,
        "description": "Sushi, topped with egg",
        "dataType": "Survey (FNDDS)",
        "score": 309.549
      },
      {
        "fdcId": 2707203,
        "description": "Egg omelet or scrambled egg, made with cooking spray",
        "dataType": "Survey (FNDDS)",
        "score": 308.30713
      },
      {
        "fdcId": 2707204,
        "description": "Egg omelet or scrambled egg, NS as to fat type",
        "dataType": "Survey (FNDDS)",
        "score": 308.30713
      },
      {
        "fdcId": 2707209,
        "description": "Egg omelet or scrambled egg, with cheese, made with butter",
        "dataType": "Survey (FNDDS)",
        "score": 308.30713
      },
      {
        "fdcId": 2707207,
        "description": "Egg omelet or scrambled egg, with cheese, made with margarine",
        "dataType": "Survey (FNDDS)",
        "score": 308.30713
      },
      {
        "fdcId": 2707208,
        "description": "Egg omelet or scrambled egg, with cheese, made with oil",
        "dataType": "Survey (FNDDS)",
        "score": 308.30713
      },
      {
        "fdcId": 2707212,
        "description": "Egg omelet or scrambled egg, with cheese, no added fat",
        "dataType": "Survey (FNDDS)",
        "score": 308.30713
      },
      {
        "fdcId": 2707216,
        "description": "Egg omelet or scrambled egg, with meat, made with butter",
        "dataType": "Survey (FNDDS)",
        "score": 308.30713
      }
    ]
  },
  "sourdough bread": {
    "totalHits": 622,
    "foods": [
      {
        "fdcId": 172675,
        "description": "Bread, french or vienna (includes sourdough)",
        "dataType": "SR Legacy",
        "score": 579.669
      },
      {
        "fdcId": 174911,
        "description": "Bread, french or vienna, toasted (includes sourdough)",
        "dataType": "SR Legacy",
        "score": 539.9857
      },
      {
        "fdcId": 172828,
        "description": "English muffins, plain, unenriched, with calcium propionate (includes sourdough)",
        "dataType": "SR Legacy",
        "score": 295.85016
      },
      {
        "fdcId": 174994,
        "description": "Muffins, English, plain, enriched, with ca prop (includes sourdough)",
        "dataType": "SR Legacy",
        "score": 295.85016
      },
      {
        "fdcId": 2707850,
        "description": "Bread, fruit",
        "dataType": "Survey (FNDDS)",
        "score": 290.1231
      },
      {
        "fdcId": 2707613,
        "description": "Bread, naan",
        "dataType": "Survey (FNDDS)",
        "score": 289.01422
      },
      {
        "fdcId": 2707851,
        "description": "Bread, zucchini",
        "dataType": "Survey (FNDDS)",
        "score": 289.01422
      },
      {
        "fdcId": 2707714,
        "description": "Bread, puri",
        "dataType": "Survey (FNDDS)",
        "score": 288.47153
      },
      {
        "fdcId": 2707849,
        "description": "Bread, pumpkin",
        "dataType": "Survey (FNDDS)",
        "score": 287.59628
      },
      {
        "fdcId": 2707755,
        "description": "Bread, rye",
        "dataType": "Survey (FNDDS)",
        "score": 287.59628
      },
      {
        "fdcId": 2707650,
        "description": "Bread, vegetable",
        "dataType": "Survey (FNDDS)",
        "score": 286.15558
      },
      {
        "fdcId": 2707598,
        "description": "Bread, white",
        "dataType": "Survey (FNDDS)",
        "score": 285.75864
      },
      {
        "fdcId": 2707687,
        "description": "Bread stuffing",
        "dataType": "Survey (FNDDS)",
        "score": 281.6915
      },
      {
        "fdcId": 2707788,
        "description": "Bread, barley",
        "dataType": "Survey (FNDDS)",
        "score": 281.6915
      },
      {
        "fdcId": 2707764,
        "description": "Bread, black",
        "dataType": "Survey (FNDDS)",
        "score": 281.6915
      },
      {
        "fdcId": 167944,
        "description": "Bread, cheese",
        "dataType": "SR Legacy",
        "score": 281.6915
      },
      {
        "fdcId": 2707618,
        "description": "Bread, cheese",
        "dataType": "Survey (FNDDS)",
        "score": 281.6915
      },
      {
        "fdcId": 171849,
        "description": "Bread, cinnamon",
        "dataType": "SR Legacy",
        "score": 281.6915
      },
      {
        "fdcId": 2707620,
        "description": "Bread, cinnamon",
        "dataType": "Survey (FNDDS)",
        "score": 281.6915
      },
      {
        "fdcId": 2707604,
        "description": "Bread, Cuban",
        "dataType": "Survey (FNDDS)",
        "score": 281.6915
      },
      {
        "fdcId": 172673,
        "description": "Bread, egg",
        "dataType": "SR Legacy",
        "score": 281.6915
      },
      {
        "fdcId": 174913,
        "description": "Bread, Italian",
        "dataType": "SR Legacy",
        "score": 281.6915
      },
      {
        "fdcId": 2707777,
        "description": "Bread, multigrain",
        "dataType": "Survey (FNDDS)",
        "score": 281.6915
      },
      {
        "fdcId": 2707848,
        "description": "Bread, nut",
        "dataType": "Survey (FNDDS)",
        "score": 281.6915
      },
      {
        "fdcId": 172678,
        "description": "Bread, oatmeal",
        "dataType": "SR Legacy",
        "score": 281.6915
      }
    ]
  }
};

export const FDC_RECORDED_DETAILS: Record<number, unknown> = {
  "171688": {
    "fdcId": 171688,
    "description": "Apples, raw, with skin (Includes foods for USDA's Food Distribution Program)",
    "dataType": "SR Legacy",
    "foodNutrients": [
      {
        "nutrient": {
          "id": 1051,
          "name": "Water",
          "unitName": "g"
        },
        "amount": 85.56
      },
      {
        "nutrient": {
          "id": 1008,
          "name": "Energy",
          "unitName": "kcal"
        },
        "amount": 52
      },
      {
        "nutrient": {
          "id": 1062,
          "name": "Energy",
          "unitName": "kJ"
        },
        "amount": 218
      },
      {
        "nutrient": {
          "id": 1003,
          "name": "Protein",
          "unitName": "g"
        },
        "amount": 0.26
      },
      {
        "nutrient": {
          "id": 1004,
          "name": "Total lipid (fat)",
          "unitName": "g"
        },
        "amount": 0.17
      },
      {
        "nutrient": {
          "id": 1007,
          "name": "Ash",
          "unitName": "g"
        },
        "amount": 0.19
      },
      {
        "nutrient": {
          "id": 1005,
          "name": "Carbohydrate, by difference",
          "unitName": "g"
        },
        "amount": 13.81
      },
      {
        "nutrient": {
          "id": 1079,
          "name": "Fiber, total dietary",
          "unitName": "g"
        },
        "amount": 2.4
      },
      {
        "nutrient": {
          "id": 2000,
          "name": "Total Sugars",
          "unitName": "g"
        },
        "amount": 10.39
      },
      {
        "nutrient": {
          "id": 1010,
          "name": "Sucrose",
          "unitName": "g"
        },
        "amount": 2.07
      },
      {
        "nutrient": {
          "id": 1011,
          "name": "Glucose",
          "unitName": "g"
        },
        "amount": 2.43
      },
      {
        "nutrient": {
          "id": 1012,
          "name": "Fructose",
          "unitName": "g"
        },
        "amount": 5.9
      },
      {
        "nutrient": {
          "id": 1013,
          "name": "Lactose",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1014,
          "name": "Maltose",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1075,
          "name": "Galactose",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1009,
          "name": "Starch",
          "unitName": "g"
        },
        "amount": 0.05
      },
      {
        "nutrient": {
          "id": 1087,
          "name": "Calcium, Ca",
          "unitName": "mg"
        },
        "amount": 6
      },
      {
        "nutrient": {
          "id": 1089,
          "name": "Iron, Fe",
          "unitName": "mg"
        },
        "amount": 0.12
      },
      {
        "nutrient": {
          "id": 1090,
          "name": "Magnesium, Mg",
          "unitName": "mg"
        },
        "amount": 5
      },
      {
        "nutrient": {
          "id": 1091,
          "name": "Phosphorus, P",
          "unitName": "mg"
        },
        "amount": 11
      },
      {
        "nutrient": {
          "id": 1092,
          "name": "Potassium, K",
          "unitName": "mg"
        },
        "amount": 107
      },
      {
        "nutrient": {
          "id": 1093,
          "name": "Sodium, Na",
          "unitName": "mg"
        },
        "amount": 1
      },
      {
        "nutrient": {
          "id": 1095,
          "name": "Zinc, Zn",
          "unitName": "mg"
        },
        "amount": 0.04
      },
      {
        "nutrient": {
          "id": 1098,
          "name": "Copper, Cu",
          "unitName": "mg"
        },
        "amount": 0.027
      },
      {
        "nutrient": {
          "id": 1101,
          "name": "Manganese, Mn",
          "unitName": "mg"
        },
        "amount": 0.035
      },
      {
        "nutrient": {
          "id": 1103,
          "name": "Selenium, Se",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1099,
          "name": "Fluoride, F",
          "unitName": "µg"
        },
        "amount": 3.3
      },
      {
        "nutrient": {
          "id": 1162,
          "name": "Vitamin C, total ascorbic acid",
          "unitName": "mg"
        },
        "amount": 4.6
      },
      {
        "nutrient": {
          "id": 1165,
          "name": "Thiamin",
          "unitName": "mg"
        },
        "amount": 0.017
      },
      {
        "nutrient": {
          "id": 1166,
          "name": "Riboflavin",
          "unitName": "mg"
        },
        "amount": 0.026
      },
      {
        "nutrient": {
          "id": 1167,
          "name": "Niacin",
          "unitName": "mg"
        },
        "amount": 0.091
      },
      {
        "nutrient": {
          "id": 1170,
          "name": "Pantothenic acid",
          "unitName": "mg"
        },
        "amount": 0.061
      },
      {
        "nutrient": {
          "id": 1175,
          "name": "Vitamin B-6",
          "unitName": "mg"
        },
        "amount": 0.041
      },
      {
        "nutrient": {
          "id": 1177,
          "name": "Folate, total",
          "unitName": "µg"
        },
        "amount": 3
      },
      {
        "nutrient": {
          "id": 1186,
          "name": "Folic acid",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1187,
          "name": "Folate, food",
          "unitName": "µg"
        },
        "amount": 3
      },
      {
        "nutrient": {
          "id": 1190,
          "name": "Folate, DFE",
          "unitName": "µg"
        },
        "amount": 3
      },
      {
        "nutrient": {
          "id": 1180,
          "name": "Choline, total",
          "unitName": "mg"
        },
        "amount": 3.4
      },
      {
        "nutrient": {
          "id": 1198,
          "name": "Betaine",
          "unitName": "mg"
        },
        "amount": 0.1
      },
      {
        "nutrient": {
          "id": 1178,
          "name": "Vitamin B-12",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1246,
          "name": "Vitamin B-12, added",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1106,
          "name": "Vitamin A, RAE",
          "unitName": "µg"
        },
        "amount": 3
      },
      {
        "nutrient": {
          "id": 1105,
          "name": "Retinol",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1107,
          "name": "Carotene, beta",
          "unitName": "µg"
        },
        "amount": 27
      },
      {
        "nutrient": {
          "id": 1108,
          "name": "Carotene, alpha",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1120,
          "name": "Cryptoxanthin, beta",
          "unitName": "µg"
        },
        "amount": 11
      },
      {
        "nutrient": {
          "id": 1104,
          "name": "Vitamin A, IU",
          "unitName": "IU"
        },
        "amount": 54
      },
      {
        "nutrient": {
          "id": 1122,
          "name": "Lycopene",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1123,
          "name": "Lutein + zeaxanthin",
          "unitName": "µg"
        },
        "amount": 29
      },
      {
        "nutrient": {
          "id": 1109,
          "name": "Vitamin E (alpha-tocopherol)",
          "unitName": "mg"
        },
        "amount": 0.18
      },
      {
        "nutrient": {
          "id": 1242,
          "name": "Vitamin E, added",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1125,
          "name": "Tocopherol, beta",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1126,
          "name": "Tocopherol, gamma",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1127,
          "name": "Tocopherol, delta",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1110,
          "name": "Vitamin D (D2 + D3), International Units",
          "unitName": "IU"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1114,
          "name": "Vitamin D (D2 + D3)",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1185,
          "name": "Vitamin K (phylloquinone)",
          "unitName": "µg"
        },
        "amount": 2.2
      },
      {
        "nutrient": {
          "id": 1184,
          "name": "Vitamin K (Dihydrophylloquinone)",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1258,
          "name": "Fatty acids, total saturated",
          "unitName": "g"
        },
        "amount": 0.028
      },
      {
        "nutrient": {
          "id": 1259,
          "name": "SFA 4:0",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1260,
          "name": "SFA 6:0",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1261,
          "name": "SFA 8:0",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1262,
          "name": "SFA 10:0",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1263,
          "name": "SFA 12:0",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1264,
          "name": "SFA 14:0",
          "unitName": "g"
        },
        "amount": 0.001
      },
      {
        "nutrient": {
          "id": 1265,
          "name": "SFA 16:0",
          "unitName": "g"
        },
        "amount": 0.024
      },
      {
        "nutrient": {
          "id": 1266,
          "name": "SFA 18:0",
          "unitName": "g"
        },
        "amount": 0.003
      },
      {
        "nutrient": {
          "id": 1292,
          "name": "Fatty acids, total monounsaturated",
          "unitName": "g"
        },
        "amount": 0.007
      },
      {
        "nutrient": {
          "id": 1275,
          "name": "MUFA 16:1",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1268,
          "name": "MUFA 18:1",
          "unitName": "g"
        },
        "amount": 0.007
      },
      {
        "nutrient": {
          "id": 1277,
          "name": "MUFA 20:1",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1279,
          "name": "MUFA 22:1",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1293,
          "name": "Fatty acids, total polyunsaturated",
          "unitName": "g"
        },
        "amount": 0.051
      },
      {
        "nutrient": {
          "id": 1269,
          "name": "PUFA 18:2",
          "unitName": "g"
        },
        "amount": 0.043
      },
      {
        "nutrient": {
          "id": 1270,
          "name": "PUFA 18:3",
          "unitName": "g"
        },
        "amount": 0.009
      },
      {
        "nutrient": {
          "id": 1276,
          "name": "PUFA 18:4",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1271,
          "name": "PUFA 20:4",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1278,
          "name": "PUFA 20:5 n-3 (EPA)",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1280,
          "name": "PUFA 22:5 n-3 (DPA)",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1272,
          "name": "PUFA 22:6 n-3 (DHA)",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1257,
          "name": "Fatty acids, total trans",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1253,
          "name": "Cholesterol",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1283,
          "name": "Phytosterols",
          "unitName": "mg"
        },
        "amount": 12
      },
      {
        "nutrient": {
          "id": 1210,
          "name": "Tryptophan",
          "unitName": "g"
        },
        "amount": 0.001
      },
      {
        "nutrient": {
          "id": 1211,
          "name": "Threonine",
          "unitName": "g"
        },
        "amount": 0.006
      },
      {
        "nutrient": {
          "id": 1212,
          "name": "Isoleucine",
          "unitName": "g"
        },
        "amount": 0.006
      },
      {
        "nutrient": {
          "id": 1213,
          "name": "Leucine",
          "unitName": "g"
        },
        "amount": 0.013
      },
      {
        "nutrient": {
          "id": 1214,
          "name": "Lysine",
          "unitName": "g"
        },
        "amount": 0.012
      },
      {
        "nutrient": {
          "id": 1215,
          "name": "Methionine",
          "unitName": "g"
        },
        "amount": 0.001
      },
      {
        "nutrient": {
          "id": 1216,
          "name": "Cystine",
          "unitName": "g"
        },
        "amount": 0.001
      },
      {
        "nutrient": {
          "id": 1217,
          "name": "Phenylalanine",
          "unitName": "g"
        },
        "amount": 0.006
      },
      {
        "nutrient": {
          "id": 1218,
          "name": "Tyrosine",
          "unitName": "g"
        },
        "amount": 0.001
      },
      {
        "nutrient": {
          "id": 1219,
          "name": "Valine",
          "unitName": "g"
        },
        "amount": 0.012
      },
      {
        "nutrient": {
          "id": 1220,
          "name": "Arginine",
          "unitName": "g"
        },
        "amount": 0.006
      },
      {
        "nutrient": {
          "id": 1221,
          "name": "Histidine",
          "unitName": "g"
        },
        "amount": 0.005
      },
      {
        "nutrient": {
          "id": 1222,
          "name": "Alanine",
          "unitName": "g"
        },
        "amount": 0.011
      },
      {
        "nutrient": {
          "id": 1223,
          "name": "Aspartic acid",
          "unitName": "g"
        },
        "amount": 0.07
      },
      {
        "nutrient": {
          "id": 1224,
          "name": "Glutamic acid",
          "unitName": "g"
        },
        "amount": 0.025
      },
      {
        "nutrient": {
          "id": 1225,
          "name": "Glycine",
          "unitName": "g"
        },
        "amount": 0.009
      },
      {
        "nutrient": {
          "id": 1226,
          "name": "Proline",
          "unitName": "g"
        },
        "amount": 0.006
      },
      {
        "nutrient": {
          "id": 1227,
          "name": "Serine",
          "unitName": "g"
        },
        "amount": 0.01
      },
      {
        "nutrient": {
          "id": 1018,
          "name": "Alcohol, ethyl",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1057,
          "name": "Caffeine",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1058,
          "name": "Theobromine",
          "unitName": "mg"
        },
        "amount": 0
      }
    ],
    "foodPortions": [
      {
        "amount": 1,
        "gramWeight": 109,
        "modifier": "cup slices",
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": 1,
        "gramWeight": 182,
        "modifier": "medium (3\" dia)",
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": 1,
        "gramWeight": 149,
        "modifier": "small (2-3/4\" dia)",
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": 1,
        "gramWeight": 242,
        "modifier": "NLEA serving",
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": 1,
        "gramWeight": 125,
        "modifier": "cup, quartered or chopped",
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": 1,
        "gramWeight": 101,
        "modifier": "extra small (2-1/2\" dia)",
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": 1,
        "gramWeight": 223,
        "modifier": "large (3-1/4\" dia)",
        "measureUnit": {
          "name": "undetermined"
        }
      }
    ]
  },
  "171689": {
    "fdcId": 171689,
    "description": "Apples, raw, without skin",
    "dataType": "SR Legacy",
    "servingSize": null,
    "servingSizeUnit": null,
    "householdServingFullText": null,
    "foodNutrients": [
      {
        "nutrient": {
          "id": 1051,
          "name": "Water",
          "unitName": "g"
        },
        "amount": 86.67
      },
      {
        "nutrient": {
          "id": 1008,
          "name": "Energy",
          "unitName": "kcal"
        },
        "amount": 48
      },
      {
        "nutrient": {
          "id": 1062,
          "name": "Energy",
          "unitName": "kJ"
        },
        "amount": 200
      },
      {
        "nutrient": {
          "id": 1003,
          "name": "Protein",
          "unitName": "g"
        },
        "amount": 0.27
      },
      {
        "nutrient": {
          "id": 1004,
          "name": "Total lipid (fat)",
          "unitName": "g"
        },
        "amount": 0.13
      },
      {
        "nutrient": {
          "id": 1007,
          "name": "Ash",
          "unitName": "g"
        },
        "amount": 0.17
      },
      {
        "nutrient": {
          "id": 1005,
          "name": "Carbohydrate, by difference",
          "unitName": "g"
        },
        "amount": 12.76
      },
      {
        "nutrient": {
          "id": 1079,
          "name": "Fiber, total dietary",
          "unitName": "g"
        },
        "amount": 1.3
      },
      {
        "nutrient": {
          "id": 2000,
          "name": "Total Sugars",
          "unitName": "g"
        },
        "amount": 10.1
      },
      {
        "nutrient": {
          "id": 1010,
          "name": "Sucrose",
          "unitName": "g"
        },
        "amount": 0.82
      },
      {
        "nutrient": {
          "id": 1011,
          "name": "Glucose",
          "unitName": "g"
        },
        "amount": 3.25
      },
      {
        "nutrient": {
          "id": 1012,
          "name": "Fructose",
          "unitName": "g"
        },
        "amount": 6.03
      },
      {
        "nutrient": {
          "id": 1013,
          "name": "Lactose",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1014,
          "name": "Maltose",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1075,
          "name": "Galactose",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1087,
          "name": "Calcium, Ca",
          "unitName": "mg"
        },
        "amount": 5
      },
      {
        "nutrient": {
          "id": 1089,
          "name": "Iron, Fe",
          "unitName": "mg"
        },
        "amount": 0.07
      },
      {
        "nutrient": {
          "id": 1090,
          "name": "Magnesium, Mg",
          "unitName": "mg"
        },
        "amount": 4
      },
      {
        "nutrient": {
          "id": 1091,
          "name": "Phosphorus, P",
          "unitName": "mg"
        },
        "amount": 11
      },
      {
        "nutrient": {
          "id": 1092,
          "name": "Potassium, K",
          "unitName": "mg"
        },
        "amount": 90
      },
      {
        "nutrient": {
          "id": 1093,
          "name": "Sodium, Na",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1095,
          "name": "Zinc, Zn",
          "unitName": "mg"
        },
        "amount": 0.05
      },
      {
        "nutrient": {
          "id": 1098,
          "name": "Copper, Cu",
          "unitName": "mg"
        },
        "amount": 0.031
      },
      {
        "nutrient": {
          "id": 1101,
          "name": "Manganese, Mn",
          "unitName": "mg"
        },
        "amount": 0.038
      },
      {
        "nutrient": {
          "id": 1103,
          "name": "Selenium, Se",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1162,
          "name": "Vitamin C, total ascorbic acid",
          "unitName": "mg"
        },
        "amount": 4
      },
      {
        "nutrient": {
          "id": 1165,
          "name": "Thiamin",
          "unitName": "mg"
        },
        "amount": 0.019
      },
      {
        "nutrient": {
          "id": 1166,
          "name": "Riboflavin",
          "unitName": "mg"
        },
        "amount": 0.028
      },
      {
        "nutrient": {
          "id": 1167,
          "name": "Niacin",
          "unitName": "mg"
        },
        "amount": 0.091
      },
      {
        "nutrient": {
          "id": 1170,
          "name": "Pantothenic acid",
          "unitName": "mg"
        },
        "amount": 0.071
      },
      {
        "nutrient": {
          "id": 1175,
          "name": "Vitamin B-6",
          "unitName": "mg"
        },
        "amount": 0.037
      },
      {
        "nutrient": {
          "id": 1177,
          "name": "Folate, total",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1186,
          "name": "Folic acid",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1187,
          "name": "Folate, food",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1190,
          "name": "Folate, DFE",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1180,
          "name": "Choline, total",
          "unitName": "mg"
        },
        "amount": 3.4
      },
      {
        "nutrient": {
          "id": 1178,
          "name": "Vitamin B-12",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1246,
          "name": "Vitamin B-12, added",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1106,
          "name": "Vitamin A, RAE",
          "unitName": "µg"
        },
        "amount": 2
      },
      {
        "nutrient": {
          "id": 1105,
          "name": "Retinol",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1107,
          "name": "Carotene, beta",
          "unitName": "µg"
        },
        "amount": 17
      },
      {
        "nutrient": {
          "id": 1108,
          "name": "Carotene, alpha",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1120,
          "name": "Cryptoxanthin, beta",
          "unitName": "µg"
        },
        "amount": 13
      },
      {
        "nutrient": {
          "id": 1104,
          "name": "Vitamin A, IU",
          "unitName": "IU"
        },
        "amount": 38
      },
      {
        "nutrient": {
          "id": 1122,
          "name": "Lycopene",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1123,
          "name": "Lutein + zeaxanthin",
          "unitName": "µg"
        },
        "amount": 18
      },
      {
        "nutrient": {
          "id": 1109,
          "name": "Vitamin E (alpha-tocopherol)",
          "unitName": "mg"
        },
        "amount": 0.05
      },
      {
        "nutrient": {
          "id": 1242,
          "name": "Vitamin E, added",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1125,
          "name": "Tocopherol, beta",
          "unitName": "mg"
        },
        "amount": 0.01
      },
      {
        "nutrient": {
          "id": 1126,
          "name": "Tocopherol, gamma",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1127,
          "name": "Tocopherol, delta",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1128,
          "name": "Tocotrienol, alpha",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1129,
          "name": "Tocotrienol, beta",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1130,
          "name": "Tocotrienol, gamma",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1131,
          "name": "Tocotrienol, delta",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1110,
          "name": "Vitamin D (D2 + D3), International Units",
          "unitName": "IU"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1114,
          "name": "Vitamin D (D2 + D3)",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1185,
          "name": "Vitamin K (phylloquinone)",
          "unitName": "µg"
        },
        "amount": 0.6
      },
      {
        "nutrient": {
          "id": 1184,
          "name": "Vitamin K (Dihydrophylloquinone)",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1258,
          "name": "Fatty acids, total saturated",
          "unitName": "g"
        },
        "amount": 0.021
      },
      {
        "nutrient": {
          "id": 1259,
          "name": "SFA 4:0",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1260,
          "name": "SFA 6:0",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1261,
          "name": "SFA 8:0",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1262,
          "name": "SFA 10:0",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1263,
          "name": "SFA 12:0",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1264,
          "name": "SFA 14:0",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1265,
          "name": "SFA 16:0",
          "unitName": "g"
        },
        "amount": 0.017
      },
      {
        "nutrient": {
          "id": 1266,
          "name": "SFA 18:0",
          "unitName": "g"
        },
        "amount": 0.002
      },
      {
        "nutrient": {
          "id": 1292,
          "name": "Fatty acids, total monounsaturated",
          "unitName": "g"
        },
        "amount": 0.005
      },
      {
        "nutrient": {
          "id": 1275,
          "name": "MUFA 16:1",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1268,
          "name": "MUFA 18:1",
          "unitName": "g"
        },
        "amount": 0.005
      },
      {
        "nutrient": {
          "id": 1277,
          "name": "MUFA 20:1",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1279,
          "name": "MUFA 22:1",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1293,
          "name": "Fatty acids, total polyunsaturated",
          "unitName": "g"
        },
        "amount": 0.037
      },
      {
        "nutrient": {
          "id": 1269,
          "name": "PUFA 18:2",
          "unitName": "g"
        },
        "amount": 0.031
      },
      {
        "nutrient": {
          "id": 1270,
          "name": "PUFA 18:3",
          "unitName": "g"
        },
        "amount": 0.007
      },
      {
        "nutrient": {
          "id": 1276,
          "name": "PUFA 18:4",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1271,
          "name": "PUFA 20:4",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1278,
          "name": "PUFA 20:5 n-3 (EPA)",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1280,
          "name": "PUFA 22:5 n-3 (DPA)",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1272,
          "name": "PUFA 22:6 n-3 (DHA)",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1257,
          "name": "Fatty acids, total trans",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1253,
          "name": "Cholesterol",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1210,
          "name": "Tryptophan",
          "unitName": "g"
        },
        "amount": 0.001
      },
      {
        "nutrient": {
          "id": 1211,
          "name": "Threonine",
          "unitName": "g"
        },
        "amount": 0.006
      },
      {
        "nutrient": {
          "id": 1212,
          "name": "Isoleucine",
          "unitName": "g"
        },
        "amount": 0.006
      },
      {
        "nutrient": {
          "id": 1213,
          "name": "Leucine",
          "unitName": "g"
        },
        "amount": 0.014
      },
      {
        "nutrient": {
          "id": 1214,
          "name": "Lysine",
          "unitName": "g"
        },
        "amount": 0.013
      },
      {
        "nutrient": {
          "id": 1215,
          "name": "Methionine",
          "unitName": "g"
        },
        "amount": 0.001
      },
      {
        "nutrient": {
          "id": 1216,
          "name": "Cystine",
          "unitName": "g"
        },
        "amount": 0.001
      },
      {
        "nutrient": {
          "id": 1217,
          "name": "Phenylalanine",
          "unitName": "g"
        },
        "amount": 0.007
      },
      {
        "nutrient": {
          "id": 1218,
          "name": "Tyrosine",
          "unitName": "g"
        },
        "amount": 0.001
      },
      {
        "nutrient": {
          "id": 1219,
          "name": "Valine",
          "unitName": "g"
        },
        "amount": 0.012
      },
      {
        "nutrient": {
          "id": 1220,
          "name": "Arginine",
          "unitName": "g"
        },
        "amount": 0.006
      },
      {
        "nutrient": {
          "id": 1221,
          "name": "Histidine",
          "unitName": "g"
        },
        "amount": 0.005
      },
      {
        "nutrient": {
          "id": 1222,
          "name": "Alanine",
          "unitName": "g"
        },
        "amount": 0.012
      },
      {
        "nutrient": {
          "id": 1223,
          "name": "Aspartic acid",
          "unitName": "g"
        },
        "amount": 0.074
      },
      {
        "nutrient": {
          "id": 1224,
          "name": "Glutamic acid",
          "unitName": "g"
        },
        "amount": 0.026
      },
      {
        "nutrient": {
          "id": 1225,
          "name": "Glycine",
          "unitName": "g"
        },
        "amount": 0.009
      },
      {
        "nutrient": {
          "id": 1226,
          "name": "Proline",
          "unitName": "g"
        },
        "amount": 0.006
      },
      {
        "nutrient": {
          "id": 1227,
          "name": "Serine",
          "unitName": "g"
        },
        "amount": 0.011
      },
      {
        "nutrient": {
          "id": 1018,
          "name": "Alcohol, ethyl",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1057,
          "name": "Caffeine",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1058,
          "name": "Theobromine",
          "unitName": "mg"
        },
        "amount": 0
      }
    ],
    "foodPortions": [
      {
        "amount": 1,
        "gramWeight": 216,
        "modifier": "large (3-1/4\" dia)",
        "portionDescription": null,
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": 1,
        "gramWeight": 110,
        "modifier": "cup slices",
        "portionDescription": null,
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": 1,
        "gramWeight": 132,
        "modifier": "small (2-3/4\" dia)",
        "portionDescription": null,
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": 1,
        "gramWeight": 161,
        "modifier": "medium (3\" dia)",
        "portionDescription": null,
        "measureUnit": {
          "name": "undetermined"
        }
      }
    ]
  },
  "171706": {
    "fdcId": 171706,
    "description": "Avocados, raw, California",
    "dataType": "SR Legacy",
    "foodNutrients": [
      {
        "nutrient": {
          "id": 1051,
          "name": "Water",
          "unitName": "g"
        },
        "amount": 72.33
      },
      {
        "nutrient": {
          "id": 1008,
          "name": "Energy",
          "unitName": "kcal"
        },
        "amount": 167
      },
      {
        "nutrient": {
          "id": 1062,
          "name": "Energy",
          "unitName": "kJ"
        },
        "amount": 697
      },
      {
        "nutrient": {
          "id": 1003,
          "name": "Protein",
          "unitName": "g"
        },
        "amount": 1.96
      },
      {
        "nutrient": {
          "id": 1004,
          "name": "Total lipid (fat)",
          "unitName": "g"
        },
        "amount": 15.41
      },
      {
        "nutrient": {
          "id": 1007,
          "name": "Ash",
          "unitName": "g"
        },
        "amount": 1.66
      },
      {
        "nutrient": {
          "id": 1005,
          "name": "Carbohydrate, by difference",
          "unitName": "g"
        },
        "amount": 8.64
      },
      {
        "nutrient": {
          "id": 1079,
          "name": "Fiber, total dietary",
          "unitName": "g"
        },
        "amount": 6.8
      },
      {
        "nutrient": {
          "id": 2000,
          "name": "Total Sugars",
          "unitName": "g"
        },
        "amount": 0.3
      },
      {
        "nutrient": {
          "id": 1010,
          "name": "Sucrose",
          "unitName": "g"
        },
        "amount": 0.06
      },
      {
        "nutrient": {
          "id": 1011,
          "name": "Glucose",
          "unitName": "g"
        },
        "amount": 0.08
      },
      {
        "nutrient": {
          "id": 1012,
          "name": "Fructose",
          "unitName": "g"
        },
        "amount": 0.08
      },
      {
        "nutrient": {
          "id": 1013,
          "name": "Lactose",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1014,
          "name": "Maltose",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1075,
          "name": "Galactose",
          "unitName": "g"
        },
        "amount": 0.08
      },
      {
        "nutrient": {
          "id": 1009,
          "name": "Starch",
          "unitName": "g"
        },
        "amount": 0.11
      },
      {
        "nutrient": {
          "id": 1087,
          "name": "Calcium, Ca",
          "unitName": "mg"
        },
        "amount": 13
      },
      {
        "nutrient": {
          "id": 1089,
          "name": "Iron, Fe",
          "unitName": "mg"
        },
        "amount": 0.61
      },
      {
        "nutrient": {
          "id": 1090,
          "name": "Magnesium, Mg",
          "unitName": "mg"
        },
        "amount": 29
      },
      {
        "nutrient": {
          "id": 1091,
          "name": "Phosphorus, P",
          "unitName": "mg"
        },
        "amount": 54
      },
      {
        "nutrient": {
          "id": 1092,
          "name": "Potassium, K",
          "unitName": "mg"
        },
        "amount": 507
      },
      {
        "nutrient": {
          "id": 1093,
          "name": "Sodium, Na",
          "unitName": "mg"
        },
        "amount": 8
      },
      {
        "nutrient": {
          "id": 1095,
          "name": "Zinc, Zn",
          "unitName": "mg"
        },
        "amount": 0.68
      },
      {
        "nutrient": {
          "id": 1098,
          "name": "Copper, Cu",
          "unitName": "mg"
        },
        "amount": 0.17
      },
      {
        "nutrient": {
          "id": 1101,
          "name": "Manganese, Mn",
          "unitName": "mg"
        },
        "amount": 0.149
      },
      {
        "nutrient": {
          "id": 1103,
          "name": "Selenium, Se",
          "unitName": "µg"
        },
        "amount": 0.4
      },
      {
        "nutrient": {
          "id": 1162,
          "name": "Vitamin C, total ascorbic acid",
          "unitName": "mg"
        },
        "amount": 8.8
      },
      {
        "nutrient": {
          "id": 1165,
          "name": "Thiamin",
          "unitName": "mg"
        },
        "amount": 0.075
      },
      {
        "nutrient": {
          "id": 1166,
          "name": "Riboflavin",
          "unitName": "mg"
        },
        "amount": 0.143
      },
      {
        "nutrient": {
          "id": 1167,
          "name": "Niacin",
          "unitName": "mg"
        },
        "amount": 1.912
      },
      {
        "nutrient": {
          "id": 1170,
          "name": "Pantothenic acid",
          "unitName": "mg"
        },
        "amount": 1.463
      },
      {
        "nutrient": {
          "id": 1175,
          "name": "Vitamin B-6",
          "unitName": "mg"
        },
        "amount": 0.287
      },
      {
        "nutrient": {
          "id": 1177,
          "name": "Folate, total",
          "unitName": "µg"
        },
        "amount": 89
      },
      {
        "nutrient": {
          "id": 1186,
          "name": "Folic acid",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1187,
          "name": "Folate, food",
          "unitName": "µg"
        },
        "amount": 89
      },
      {
        "nutrient": {
          "id": 1190,
          "name": "Folate, DFE",
          "unitName": "µg"
        },
        "amount": 89
      },
      {
        "nutrient": {
          "id": 1180,
          "name": "Choline, total",
          "unitName": "mg"
        },
        "amount": 14.2
      },
      {
        "nutrient": {
          "id": 1198,
          "name": "Betaine",
          "unitName": "mg"
        },
        "amount": 0.7
      },
      {
        "nutrient": {
          "id": 1178,
          "name": "Vitamin B-12",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1106,
          "name": "Vitamin A, RAE",
          "unitName": "µg"
        },
        "amount": 7
      },
      {
        "nutrient": {
          "id": 1105,
          "name": "Retinol",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1107,
          "name": "Carotene, beta",
          "unitName": "µg"
        },
        "amount": 63
      },
      {
        "nutrient": {
          "id": 1108,
          "name": "Carotene, alpha",
          "unitName": "µg"
        },
        "amount": 24
      },
      {
        "nutrient": {
          "id": 1120,
          "name": "Cryptoxanthin, beta",
          "unitName": "µg"
        },
        "amount": 27
      },
      {
        "nutrient": {
          "id": 1104,
          "name": "Vitamin A, IU",
          "unitName": "IU"
        },
        "amount": 147
      },
      {
        "nutrient": {
          "id": 1122,
          "name": "Lycopene",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1123,
          "name": "Lutein + zeaxanthin",
          "unitName": "µg"
        },
        "amount": 271
      },
      {
        "nutrient": {
          "id": 1109,
          "name": "Vitamin E (alpha-tocopherol)",
          "unitName": "mg"
        },
        "amount": 1.97
      },
      {
        "nutrient": {
          "id": 1125,
          "name": "Tocopherol, beta",
          "unitName": "mg"
        },
        "amount": 0.04
      },
      {
        "nutrient": {
          "id": 1126,
          "name": "Tocopherol, gamma",
          "unitName": "mg"
        },
        "amount": 0.32
      },
      {
        "nutrient": {
          "id": 1127,
          "name": "Tocopherol, delta",
          "unitName": "mg"
        },
        "amount": 0.02
      },
      {
        "nutrient": {
          "id": 1128,
          "name": "Tocotrienol, alpha",
          "unitName": "mg"
        },
        "amount": 0.01
      },
      {
        "nutrient": {
          "id": 1129,
          "name": "Tocotrienol, beta",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1130,
          "name": "Tocotrienol, gamma",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1131,
          "name": "Tocotrienol, delta",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1110,
          "name": "Vitamin D (D2 + D3), International Units",
          "unitName": "IU"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1114,
          "name": "Vitamin D (D2 + D3)",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1185,
          "name": "Vitamin K (phylloquinone)",
          "unitName": "µg"
        },
        "amount": 21
      },
      {
        "nutrient": {
          "id": 1184,
          "name": "Vitamin K (Dihydrophylloquinone)",
          "unitName": "µg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1258,
          "name": "Fatty acids, total saturated",
          "unitName": "g"
        },
        "amount": 2.126
      },
      {
        "nutrient": {
          "id": 1261,
          "name": "SFA 8:0",
          "unitName": "g"
        },
        "amount": 0.001
      },
      {
        "nutrient": {
          "id": 1262,
          "name": "SFA 10:0",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1263,
          "name": "SFA 12:0",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1264,
          "name": "SFA 14:0",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1299,
          "name": "SFA 15:0",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1265,
          "name": "SFA 16:0",
          "unitName": "g"
        },
        "amount": 2.075
      },
      {
        "nutrient": {
          "id": 1300,
          "name": "SFA 17:0",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1266,
          "name": "SFA 18:0",
          "unitName": "g"
        },
        "amount": 0.049
      },
      {
        "nutrient": {
          "id": 1267,
          "name": "SFA 20:0",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1273,
          "name": "SFA 22:0",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1301,
          "name": "SFA 24:0",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1292,
          "name": "Fatty acids, total monounsaturated",
          "unitName": "g"
        },
        "amount": 9.799
      },
      {
        "nutrient": {
          "id": 1274,
          "name": "MUFA 14:1",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1333,
          "name": "MUFA 15:1",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1275,
          "name": "MUFA 16:1",
          "unitName": "g"
        },
        "amount": 0.698
      },
      {
        "nutrient": {
          "id": 1323,
          "name": "MUFA 17:1",
          "unitName": "g"
        },
        "amount": 0.01
      },
      {
        "nutrient": {
          "id": 1268,
          "name": "MUFA 18:1",
          "unitName": "g"
        },
        "amount": 9.066
      },
      {
        "nutrient": {
          "id": 1277,
          "name": "MUFA 20:1",
          "unitName": "g"
        },
        "amount": 0.025
      },
      {
        "nutrient": {
          "id": 1279,
          "name": "MUFA 22:1",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1293,
          "name": "Fatty acids, total polyunsaturated",
          "unitName": "g"
        },
        "amount": 1.816
      },
      {
        "nutrient": {
          "id": 1269,
          "name": "PUFA 18:2",
          "unitName": "g"
        },
        "amount": 1.674
      },
      {
        "nutrient": {
          "id": 1270,
          "name": "PUFA 18:3",
          "unitName": "g"
        },
        "amount": 0.125
      },
      {
        "nutrient": {
          "id": 1404,
          "name": "PUFA 18:3 n-3 c,c,c (ALA)",
          "unitName": "g"
        },
        "amount": 0.111
      },
      {
        "nutrient": {
          "id": 1321,
          "name": "PUFA 18:3 n-6 c,c,c",
          "unitName": "g"
        },
        "amount": 0.015
      },
      {
        "nutrient": {
          "id": 1276,
          "name": "PUFA 18:4",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1313,
          "name": "PUFA 20:2 n-6 c,c",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1325,
          "name": "PUFA 20:3",
          "unitName": "g"
        },
        "amount": 0.016
      },
      {
        "nutrient": {
          "id": 1271,
          "name": "PUFA 20:4",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1278,
          "name": "PUFA 20:5 n-3 (EPA)",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1280,
          "name": "PUFA 22:5 n-3 (DPA)",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1272,
          "name": "PUFA 22:6 n-3 (DHA)",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1257,
          "name": "Fatty acids, total trans",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1253,
          "name": "Cholesterol",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1285,
          "name": "Stigmasterol",
          "unitName": "mg"
        },
        "amount": 2
      },
      {
        "nutrient": {
          "id": 1286,
          "name": "Campesterol",
          "unitName": "mg"
        },
        "amount": 5
      },
      {
        "nutrient": {
          "id": 1288,
          "name": "Beta-sitosterol",
          "unitName": "mg"
        },
        "amount": 76
      },
      {
        "nutrient": {
          "id": 1210,
          "name": "Tryptophan",
          "unitName": "g"
        },
        "amount": 0.025
      },
      {
        "nutrient": {
          "id": 1211,
          "name": "Threonine",
          "unitName": "g"
        },
        "amount": 0.072
      },
      {
        "nutrient": {
          "id": 1212,
          "name": "Isoleucine",
          "unitName": "g"
        },
        "amount": 0.083
      },
      {
        "nutrient": {
          "id": 1213,
          "name": "Leucine",
          "unitName": "g"
        },
        "amount": 0.141
      },
      {
        "nutrient": {
          "id": 1214,
          "name": "Lysine",
          "unitName": "g"
        },
        "amount": 0.129
      },
      {
        "nutrient": {
          "id": 1215,
          "name": "Methionine",
          "unitName": "g"
        },
        "amount": 0.037
      },
      {
        "nutrient": {
          "id": 1216,
          "name": "Cystine",
          "unitName": "g"
        },
        "amount": 0.027
      },
      {
        "nutrient": {
          "id": 1217,
          "name": "Phenylalanine",
          "unitName": "g"
        },
        "amount": 0.095
      },
      {
        "nutrient": {
          "id": 1218,
          "name": "Tyrosine",
          "unitName": "g"
        },
        "amount": 0.048
      },
      {
        "nutrient": {
          "id": 1219,
          "name": "Valine",
          "unitName": "g"
        },
        "amount": 0.105
      },
      {
        "nutrient": {
          "id": 1220,
          "name": "Arginine",
          "unitName": "g"
        },
        "amount": 0.087
      },
      {
        "nutrient": {
          "id": 1221,
          "name": "Histidine",
          "unitName": "g"
        },
        "amount": 0.048
      },
      {
        "nutrient": {
          "id": 1222,
          "name": "Alanine",
          "unitName": "g"
        },
        "amount": 0.106
      },
      {
        "nutrient": {
          "id": 1223,
          "name": "Aspartic acid",
          "unitName": "g"
        },
        "amount": 0.232
      },
      {
        "nutrient": {
          "id": 1224,
          "name": "Glutamic acid",
          "unitName": "g"
        },
        "amount": 0.282
      },
      {
        "nutrient": {
          "id": 1225,
          "name": "Glycine",
          "unitName": "g"
        },
        "amount": 0.102
      },
      {
        "nutrient": {
          "id": 1226,
          "name": "Proline",
          "unitName": "g"
        },
        "amount": 0.096
      },
      {
        "nutrient": {
          "id": 1227,
          "name": "Serine",
          "unitName": "g"
        },
        "amount": 0.112
      }
    ],
    "foodPortions": [
      {
        "amount": 1,
        "gramWeight": 136,
        "modifier": "fruit, without skin and seed",
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": 1,
        "gramWeight": 230,
        "modifier": "cup, pureed",
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": 1,
        "gramWeight": 50,
        "modifier": "NLEA serving",
        "measureUnit": {
          "name": "undetermined"
        }
      }
    ]
  },
  "172675": {
    "fdcId": 172675,
    "description": "Bread, french or vienna (includes sourdough)",
    "dataType": "SR Legacy",
    "servingSize": null,
    "servingSizeUnit": null,
    "householdServingFullText": null,
    "foodNutrients": [
      {
        "nutrient": {
          "id": 1008,
          "name": "Energy",
          "unitName": "kcal"
        },
        "amount": 272
      },
      {
        "nutrient": {
          "id": 1062,
          "name": "Energy",
          "unitName": "kJ"
        },
        "amount": 1139
      },
      {
        "nutrient": {
          "id": 1003,
          "name": "Protein",
          "unitName": "g"
        },
        "amount": 10.75
      },
      {
        "nutrient": {
          "id": 1004,
          "name": "Total lipid (fat)",
          "unitName": "g"
        },
        "amount": 2.42
      },
      {
        "nutrient": {
          "id": 1005,
          "name": "Carbohydrate, by difference",
          "unitName": "g"
        },
        "amount": 51.88
      },
      {
        "nutrient": {
          "id": 1079,
          "name": "Fiber, total dietary",
          "unitName": "g"
        },
        "amount": 2.2
      },
      {
        "nutrient": {
          "id": 2000,
          "name": "Total Sugars",
          "unitName": "g"
        },
        "amount": 4.62
      },
      {
        "nutrient": {
          "id": 1093,
          "name": "Sodium, Na",
          "unitName": "mg"
        },
        "amount": 602
      },
      {
        "nutrient": {
          "id": 1258,
          "name": "Fatty acids, total saturated",
          "unitName": "g"
        },
        "amount": 0.529
      },
      {
        "nutrient": {
          "id": 1404,
          "name": "PUFA 18:3 n-3 c,c,c (ALA)",
          "unitName": "g"
        },
        "amount": 0.063
      },
      {
        "nutrient": {
          "id": 1278,
          "name": "PUFA 20:5 n-3 (EPA)",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1280,
          "name": "PUFA 22:5 n-3 (DPA)",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1272,
          "name": "PUFA 22:6 n-3 (DHA)",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1257,
          "name": "Fatty acids, total trans",
          "unitName": "g"
        },
        "amount": 0.005
      },
      {
        "nutrient": {
          "id": 1253,
          "name": "Cholesterol",
          "unitName": "mg"
        },
        "amount": 0
      }
    ],
    "foodPortions": [
      {
        "amount": 1,
        "gramWeight": 28.35,
        "modifier": "oz",
        "portionDescription": null,
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": 1,
        "gramWeight": 139,
        "modifier": "slice",
        "portionDescription": null,
        "measureUnit": {
          "name": "undetermined"
        }
      }
    ]
  },
  "2517161": {
    "fdcId": 2517161,
    "description": "Cheerios Cereal",
    "dataType": "Branded",
    "servingSize": 20,
    "servingSizeUnit": "GRM",
    "householdServingFullText": "3/4 cup (20g) (age 1-3 years)",
    "brandOwner": "General Mills",
    "labelNutrients": {
      "fat": {
        "value": 1.28
      },
      "saturatedFat": {
        "value": 0.256
      },
      "transFat": {
        "value": 0
      },
      "cholesterol": {
        "value": 0
      },
      "sodium": {
        "value": 97.4
      },
      "carbohydrates": {
        "value": 14.9
      },
      "fiber": {
        "value": 2.06
      },
      "sugars": {
        "value": 1.03
      },
      "protein": {
        "value": 2.56
      },
      "calcium": {
        "value": 66.6
      },
      "iron": {
        "value": 6.46
      },
      "potassium": {
        "value": 128
      },
      "addedSugar": {
        "value": 1.02
      },
      "calories": {
        "value": 71.8
      }
    },
    "foodNutrients": [
      {
        "nutrient": {
          "id": 1175,
          "name": "Vitamin B-6",
          "unitName": "mg"
        },
        "amount": 3
      },
      {
        "nutrient": {
          "id": 1092,
          "name": "Potassium, K",
          "unitName": "mg"
        },
        "amount": 641
      },
      {
        "nutrient": {
          "id": 1258,
          "name": "Fatty acids, total saturated",
          "unitName": "g"
        },
        "amount": 1.28
      },
      {
        "nutrient": {
          "id": 1089,
          "name": "Iron, Fe",
          "unitName": "mg"
        },
        "amount": 32.31
      },
      {
        "nutrient": {
          "id": 1235,
          "name": "Sugars, added",
          "unitName": "g"
        },
        "amount": 5.1
      },
      {
        "nutrient": {
          "id": 1082,
          "name": "Fiber, soluble",
          "unitName": "g"
        },
        "amount": 3
      },
      {
        "nutrient": {
          "id": 1110,
          "name": "Vitamin D (D2 + D3), International Units",
          "unitName": "IU"
        },
        "amount": 205
      },
      {
        "nutrient": {
          "id": 1257,
          "name": "Fatty acids, total trans",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1090,
          "name": "Magnesium, Mg",
          "unitName": "mg"
        },
        "amount": 700
      },
      {
        "nutrient": {
          "id": 1079,
          "name": "Fiber, total dietary",
          "unitName": "g"
        },
        "amount": 10.3
      },
      {
        "nutrient": {
          "id": 1186,
          "name": "Folic acid",
          "unitName": "µg"
        },
        "amount": 115
      },
      {
        "nutrient": {
          "id": 1177,
          "name": "Folate, total",
          "unitName": "µg"
        },
        "amount": 500
      },
      {
        "nutrient": {
          "id": 1293,
          "name": "Fatty acids, total polyunsaturated",
          "unitName": "g"
        },
        "amount": 2.56
      },
      {
        "nutrient": {
          "id": 1104,
          "name": "Vitamin A, IU",
          "unitName": "IU"
        },
        "amount": 3750
      },
      {
        "nutrient": {
          "id": 1165,
          "name": "Thiamin",
          "unitName": "mg"
        },
        "amount": 2
      },
      {
        "nutrient": {
          "id": 1292,
          "name": "Fatty acids, total monounsaturated",
          "unitName": "g"
        },
        "amount": 2.56
      },
      {
        "nutrient": {
          "id": 1162,
          "name": "Vitamin C, total ascorbic acid",
          "unitName": "mg"
        },
        "amount": 90
      },
      {
        "nutrient": {
          "id": 1087,
          "name": "Calcium, Ca",
          "unitName": "mg"
        },
        "amount": 333
      },
      {
        "nutrient": {
          "id": 1091,
          "name": "Phosphorus, P",
          "unitName": "mg"
        },
        "amount": 750
      },
      {
        "nutrient": {
          "id": 1005,
          "name": "Carbohydrate, by difference",
          "unitName": "g"
        },
        "amount": 74.36
      },
      {
        "nutrient": {
          "id": 1095,
          "name": "Zinc, Zn",
          "unitName": "mg"
        },
        "amount": 26.25
      },
      {
        "nutrient": {
          "id": 1003,
          "name": "Protein",
          "unitName": "g"
        },
        "amount": 12.82
      },
      {
        "nutrient": {
          "id": 1008,
          "name": "Energy",
          "unitName": "kcal"
        },
        "amount": 359
      },
      {
        "nutrient": {
          "id": 1093,
          "name": "Sodium, Na",
          "unitName": "mg"
        },
        "amount": 487
      },
      {
        "nutrient": {
          "id": 1253,
          "name": "Cholesterol",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1178,
          "name": "Vitamin B-12",
          "unitName": "µg"
        },
        "amount": 7.5
      },
      {
        "nutrient": {
          "id": 1004,
          "name": "Total lipid (fat)",
          "unitName": "g"
        },
        "amount": 6.41
      },
      {
        "nutrient": {
          "id": 2000,
          "name": "Total Sugars",
          "unitName": "g"
        },
        "amount": 5.13
      }
    ],
    "foodPortions": []
  },
  "2709215": {
    "fdcId": 2709215,
    "description": "Apple, raw",
    "dataType": "Survey (FNDDS)",
    "servingSize": null,
    "servingSizeUnit": null,
    "householdServingFullText": null,
    "foodNutrients": [
      {
        "nutrient": {
          "id": 1003,
          "name": "Protein",
          "unitName": "g"
        },
        "amount": 0.17
      },
      {
        "nutrient": {
          "id": 1004,
          "name": "Total lipid (fat)",
          "unitName": "g"
        },
        "amount": 0.15
      },
      {
        "nutrient": {
          "id": 1005,
          "name": "Carbohydrate, by difference",
          "unitName": "g"
        },
        "amount": 14.8
      },
      {
        "nutrient": {
          "id": 1008,
          "name": "Energy",
          "unitName": "kcal"
        },
        "amount": 61
      },
      {
        "nutrient": {
          "id": 2000,
          "name": "Total Sugars",
          "unitName": "g"
        },
        "amount": 12.1
      },
      {
        "nutrient": {
          "id": 1079,
          "name": "Fiber, total dietary",
          "unitName": "g"
        },
        "amount": 2.1
      },
      {
        "nutrient": {
          "id": 1093,
          "name": "Sodium, Na",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1253,
          "name": "Cholesterol",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1258,
          "name": "Fatty acids, total saturated",
          "unitName": "g"
        },
        "amount": 0.028
      },
      {
        "nutrient": {
          "id": 1272,
          "name": "PUFA 22:6 n-3 (DHA)",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1278,
          "name": "PUFA 20:5 n-3 (EPA)",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1280,
          "name": "PUFA 22:5 n-3 (DPA)",
          "unitName": "g"
        },
        "amount": 0
      }
    ],
    "foodPortions": [
      {
        "amount": null,
        "gramWeight": 165,
        "modifier": "62015",
        "portionDescription": "1 small",
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": null,
        "gramWeight": 34,
        "modifier": "64236",
        "portionDescription": "1 single serving package",
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": null,
        "gramWeight": 200,
        "modifier": "90000",
        "portionDescription": "Quantity not specified",
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": null,
        "gramWeight": 25,
        "modifier": "61935",
        "portionDescription": "1 slice",
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": null,
        "gramWeight": 200,
        "modifier": "61238",
        "portionDescription": "1 medium",
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": null,
        "gramWeight": 295,
        "modifier": "60749",
        "portionDescription": "1 extra large",
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": null,
        "gramWeight": 242,
        "modifier": "60919",
        "portionDescription": "1 large",
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": null,
        "gramWeight": 125,
        "modifier": "10205",
        "portionDescription": "1 cup",
        "measureUnit": {
          "name": "undetermined"
        }
      }
    ]
  },
  "2709223": {
    "fdcId": 2709223,
    "description": "Avocado, raw",
    "dataType": "Survey (FNDDS)",
    "servingSize": null,
    "servingSizeUnit": null,
    "householdServingFullText": null,
    "foodNutrients": [
      {
        "nutrient": {
          "id": 1003,
          "name": "Protein",
          "unitName": "g"
        },
        "amount": 2
      },
      {
        "nutrient": {
          "id": 1004,
          "name": "Total lipid (fat)",
          "unitName": "g"
        },
        "amount": 14.7
      },
      {
        "nutrient": {
          "id": 1005,
          "name": "Carbohydrate, by difference",
          "unitName": "g"
        },
        "amount": 8.53
      },
      {
        "nutrient": {
          "id": 1008,
          "name": "Energy",
          "unitName": "kcal"
        },
        "amount": 160
      },
      {
        "nutrient": {
          "id": 2000,
          "name": "Total Sugars",
          "unitName": "g"
        },
        "amount": 0.66
      },
      {
        "nutrient": {
          "id": 1079,
          "name": "Fiber, total dietary",
          "unitName": "g"
        },
        "amount": 6.7
      },
      {
        "nutrient": {
          "id": 1093,
          "name": "Sodium, Na",
          "unitName": "mg"
        },
        "amount": 7
      },
      {
        "nutrient": {
          "id": 1253,
          "name": "Cholesterol",
          "unitName": "mg"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1258,
          "name": "Fatty acids, total saturated",
          "unitName": "g"
        },
        "amount": 2.13
      },
      {
        "nutrient": {
          "id": 1272,
          "name": "PUFA 22:6 n-3 (DHA)",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1278,
          "name": "PUFA 20:5 n-3 (EPA)",
          "unitName": "g"
        },
        "amount": 0
      },
      {
        "nutrient": {
          "id": 1280,
          "name": "PUFA 22:5 n-3 (DPA)",
          "unitName": "g"
        },
        "amount": 0
      }
    ],
    "foodPortions": [
      {
        "amount": null,
        "gramWeight": 30,
        "modifier": "90000",
        "portionDescription": "Quantity not specified",
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": null,
        "gramWeight": 230,
        "modifier": "10119",
        "portionDescription": "1 cup, mashed or pureed",
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": null,
        "gramWeight": 15,
        "modifier": "61935",
        "portionDescription": "1 slice",
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": null,
        "gramWeight": 150,
        "modifier": "10205",
        "portionDescription": "1 cup",
        "measureUnit": {
          "name": "undetermined"
        }
      },
      {
        "amount": null,
        "gramWeight": 150,
        "modifier": "60813",
        "portionDescription": "1 fruit",
        "measureUnit": {
          "name": "undetermined"
        }
      }
    ]
  }
};
