'use strict';

// Import the Dialogflow module from the Actions on Google client library.
const {dialogflow, Permission, List} = require('actions-on-google');

// Import the firebase-functions package for deployment.
const functions = require('firebase-functions');

// Instantiate the Dialogflow client.
const app = dialogflow({debug: true});

const https = require('https');

const googleApiKey = `REPLACE_WITH_API_KEY`;

app.intent('search_taxi', (conv, {destination}) => {

    function buildODTSearchRequest(user_location, dest_location) {
        return `{
                    "from": {
                        "latitude": ${user_location.coordinates.latitude},
                        "longitude": ${user_location.coordinates.longitude},
                        "name": "${user_location.formattedAddress}",
                        "city": "${user_location.city}",
                        "country": "GB"
                    },
                    "to": {
                        "latitude": ${dest_location.geometry.location.lat},
                        "longitude": ${dest_location.geometry.location.lng},
                        "name": "${dest_location.formatted_address}",
                        "city": "London",
                        "country": "GB"
                    },
                    "customerAccountId": "345696001",
                    "currencyCode" : "GBP",
                    "deviceDetails": {
                        "platform": "Android",
                        "platformVersion": "9.0.3",
                        "appVersion": "18.1.0",
                        "notificationToken": "QCUZM-SMLSKDLKSBLARG"
                    }
                }`;
    }


    function httpsRequest(params, postData) {
        return new Promise(function (resolve, reject) {
            var req = https.request(params, function (res) {

                if (res.statusCode < 200 || res.statusCode >= 300) {
                    return reject(new Error('statusCode=' + res.statusCode));
                }

                var body = [];
                res.on('data', function (chunk) {
                    body.push(chunk);
                });

                res.on('end', function () {
                    try {
                        body = JSON.parse(Buffer.concat(body).toString());
                    } catch (e) {
                        reject(e);
                    }
                    resolve(body);
                });
            });
            req.on('error', function (err) {
                reject(err);
            });
            if (postData) {
                req.write(postData);
            }
            req.end();
        });
    }

    return new Promise(function (resolve, reject) {
        httpsRequest({
            host: 'maps.googleapis.com',
            method: 'GET',
            path: `/maps/api/geocode/json?address=${encodeURI(destination)}&key=${googleApiKey}`
        })
            .then(function (body) {
                console.log(body);

                let dest_location = body.results[0]
                let user_location = conv.device.location;

                let request = buildODTSearchRequest(user_location, dest_location);
                console.log(`request: ${request}`);

                conv.ask(`Lets go to ${destination}, ${body.results[0].formatted_address}. Look what options I found:`);

                console.log(`moceked response: ${mocked_response}, ${mocked_response.searchResults}`);

                let products = {};
                mocked_response.searchResults.forEach((category)=> {
                    category.products.forEach((product) => {
                        products[product.productType.replace(' ', '_')] = {
                            synonyms: [product.productType],
                            title: product.productType,
                            description: `${product.price.estimate.amount} ${product.price.estimate.currencyCode}`
                        };

                        SELECTED_ITEM_RESPONSES[product.productType.replace(' ', '_')] =
                            `You selected ${product.productType}. Estimated cost for the ride is ${product.price.estimate.amount} ${product.price.estimate.currencyCode}`
                    });
                });

                console.log(products);

                conv.ask(new List({
                    items: products
                }));

                resolve(body);

            })
            .catch(function (err) {
                console.log(err);
                conv.close(`Internal Error`);
                reject(err);
            })
    });
});

let SELECTED_ITEM_RESPONSES = {};

app.intent('List - OPTION', (conv, params, option) => {

    conv.close(SELECTED_ITEM_RESPONSES[option]);
});


app.intent('welcome', (conv) => {
  const permissions = ['NAME'];
  let context = 'To find you taxi';
  // Location permissions only work for verified users
  if (conv.user.verification === 'VERIFIED') {
    permissions.push('DEVICE_PRECISE_LOCATION');
    context += ' and know your location';
  }
  const options = {
    context,
    permissions,
  };
  conv.ask(new Permission(options));
});

app.intent('permission_handler', (conv, params, confirmationGranted) => {
  const {location} = conv.device;
  const {name} = conv.user;
  if (confirmationGranted && name && location) {
    conv.ask(`Okay ${name.display}, I see you're at ${location.formattedAddress}.`);
    conv.ask(` Where do you want to go?`);
  } else {
    conv.close(`OK, Good bye.`);
  }
});


// Set the DialogflowApp object to handle the HTTPS POST request.
exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);

let mocked_response = JSON.parse(`{
    "searchResults": [
        {
            "category": "ECONOMY",
            "products": [
                {
                    "searchResultId": "SEARCH_RESULT-92509789-8a22-4de1-b878-d30c614ced37",
                    "productType": "Grab Family",
                    "productId": "MTAyNTYyODUw",
                    "etaInSeconds": 420,
                    "vehicle": {
                        "passengerCapacity": 4
                    },
                    "price": {
                        "estimate": {
                            "amount": "12.42",
                            "currencyCode": "GBP"
                        }
                    },
                    "supplier": {
                        "name": "Grab",
                        "logoUrl": "https://q-xx.bstatic.com/data/taxi_images/Grab_128x128.png"
                    }
                },
                {
                    "searchResultId": "SEARCH_RESULT-6a5e4eed-56d3-4523-9bfb-1adf5db7109c",
                    "productType": "Private Economy",
                    "productId": "LTE3OTA2MTgxMw==",
                    "etaInSeconds": 420,
                    "vehicle": {
                        "passengerCapacity": 4
                    },
                    "price": {
                        "estimate": {
                            "amount": "13.24",
                            "currencyCode": "GBP"
                        }
                    },
                    "supplier": {
                        "name": "Grab",
                        "logoUrl": "https://q-xx.bstatic.com/data/taxi_images/Grab_128x128.png"
                    }
                },
                {
                    "searchResultId": "SEARCH_RESULT-0aa1553f-dbe8-4522-8779-d8d0f9e1f031",
                    "productType": "GrabBike",
                    "productId": "LTE1MDY1OTQxMzg=",
                    "etaInSeconds": 180,
                    "vehicle": {
                        "passengerCapacity": 1
                    },
                    "price": {
                        "estimate": {
                            "amount": "13.63",
                            "currencyCode": "GBP"
                        }
                    },
                    "supplier": {
                        "name": "Grab",
                        "logoUrl": "https://q-xx.bstatic.com/data/taxi_images/Grab_128x128.png"
                    }
                },
                {
                    "searchResultId": "SEARCH_RESULT-40c595a4-60a3-44a7-99cb-139a9c2d8eb7",
                    "productType": "Private Standard",
                    "productId": "LTgyNDg5NDc2OA==",
                    "etaInSeconds": 300,
                    "vehicle": {
                        "passengerCapacity": 4
                    },
                    "price": {
                        "estimate": {
                            "amount": "14.49",
                            "currencyCode": "GBP"
                        }
                    },
                    "supplier": {
                        "name": "Grab",
                        "logoUrl": "https://q-xx.bstatic.com/data/taxi_images/Grab_128x128.png"
                    }
                },
                {
                    "searchResultId": "SEARCH_RESULT-e360d158-ba36-470e-a9cb-6d19ed3ec6b5",
                    "productType": "Large Private Standard",
                    "productId": "MjA2NDczODI5MQ==",
                    "etaInSeconds": 420,
                    "vehicle": {
                        "passengerCapacity": 6
                    },
                    "price": {
                        "estimate": {
                            "amount": "14.70",
                            "currencyCode": "GBP"
                        }
                    },
                    "supplier": {
                        "name": "Grab",
                        "logoUrl": "https://q-xx.bstatic.com/data/taxi_images/Grab_128x128.png"
                    }
                },
                {
                    "searchResultId": "SEARCH_RESULT-307d13d8-8bd8-4d4e-8db4-2e28847efe84",
                    "productType": "Standard Taxi",
                    "productId": "MTc4ODAxOTU5NQ==",
                    "etaInSeconds": 120,
                    "vehicle": {
                        "passengerCapacity": 4
                    },
                    "price": {
                        "estimate": {
                            "amount": "18.60",
                            "currencyCode": "GBP"
                        }
                    },
                    "supplier": {
                        "name": "Grab",
                        "logoUrl": "https://q-xx.bstatic.com/data/taxi_images/Grab_128x128.png"
                    }
                },
                {
                    "searchResultId": "SEARCH_RESULT-aa2a2e77-25e3-46fc-8ee4-711a4508cb66",
                    "productType": "XL Taxi",
                    "productId": "MTIwMDQ4Nzg5NA==",
                    "etaInSeconds": 300,
                    "vehicle": {
                        "passengerCapacity": 6
                    },
                    "price": {
                        "estimate": {
                            "amount": "20.85",
                            "currencyCode": "GBP"
                        }
                    },
                    "supplier": {
                        "name": "Grab",
                        "logoUrl": "https://q-xx.bstatic.com/data/taxi_images/Grab_128x128.png"
                    }
                }
            ]
        },
        {
            "category": "PREMIER",
            "products": [
                {
                    "searchResultId": "SEARCH_RESULT-78065750-497d-4917-81da-b67ffa7076bf",
                    "productType": "Private Exec",
                    "productId": "LTEwNDkwNTc0NTQ=",
                    "etaInSeconds": 120,
                    "vehicle": {
                        "passengerCapacity": 4
                    },
                    "price": {
                        "estimate": {
                            "amount": "21.39",
                            "currencyCode": "GBP"
                        }
                    },
                    "supplier": {
                        "name": "Grab",
                        "logoUrl": "https://q-xx.bstatic.com/data/taxi_images/Grab_128x128.png"
                    }
                },
                {
                    "searchResultId": "SEARCH_RESULT-a82e8169-b1c9-48ce-b394-8936b885fd63",
                    "productType": "Private VIP",
                    "productId": "LTIwNjM3ODI5",
                    "etaInSeconds": 420,
                    "vehicle": {
                        "passengerCapacity": 3
                    },
                    "price": {
                        "estimate": {
                            "amount": "23.17",
                            "currencyCode": "GBP"
                        }
                    },
                    "supplier": {
                        "name": "Grab",
                        "logoUrl": "https://q-xx.bstatic.com/data/taxi_images/Grab_128x128.png"
                    }
                }
            ]
        }
    ]
}`);
