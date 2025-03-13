'use strict';

const events = {
    none: 0,
    discount: 1,
    guarantee: 2,
    extra: 4,
    shining: 3,
    boomchance: 8,
}

const mvp = {
    none: 1,
    silver: 0.97,
    gold: 0.95,
    diamond: 0.9
}

const destroyStar = 12;

const data = {
    0: { success: 0.95, drop: false },
    1: { success: 0.9, drop: false },
    2: { success: 0.85, drop: false },
    3: { success: 0.85, drop: false },
    4: { success: 0.8, drop: false },
    5: { success: 0.75, drop: false },
    6: { success: 0.7, drop: false },
    7: { success: 0.65, drop: false },
    8: { success: 0.6, drop: false },
    9: { success: 0.55, drop: false },
    10: { success: 0.5, drop: false },
    11: { success: 0.45, drop: false },
    12: { success: 0.4, drop: false },
    13: { success: 0.35, drop: false },
    14: { success: 0.3, drop: false },
    15: { success: 0.3, drop: false, destroy: 0.021, safeguard: true },
    16: { success: 0.3, drop: false, destroy: 0.021, safeguard: true },
    17: { success: 0.15, drop: false, destroy: 0.068, safeguard: true },
    18: { success: 0.15, drop: false, destroy: 0.068, safeguard: false },
    19: { success: 0.15, drop: false, destroy: 0.085, safeguard: false },
    20: { success: 0.3, drop: false, destroy: 0.105, safeguard: false },
    21: { success: 0.15, drop: false, destroy: 0.1275, safeguard: false },
    22: { success: 0.15, drop: false, destroy: 0.17, safeguard: false },
    23: { success: 0.10, drop: false, destroy: 0.18, safeguard: false },
    24: { success: 0.10, drop: false, destroy: 0.18, safeguard: false },
    25: { success: 0.10, drop: false, destroy: 0.18, safeguard: false },
    26: { success: 0.07, drop: false, destroy: 0.1860, safeguard: false },
    27: { success: 0.05, drop: false, destroy: 0.19, safeguard: false },
    28: { success: 0.03, drop: false, destroy: 0.194, safeguard: false },
    29: { success: 0.01, drop: false, destroy: 0.198, safeguard: false },
};

// lvl 140:
// 17->18 44,826,900 ~1.33x higher

// lvl 160:
// 18->19 165,920,200 ~ 2.85x higher
// 21->22 138,036,600 ~ 1.6x higher
//
// 22->23 97,274,600 same
// 23->24 109,120,000 same
// 24->25 121,834,900 same
// 25->26 135,444,400 same formula
//
// lvl 250
// 16->17 164,060,800 same
// 19->20 1,130,808,000 ~ 4.44x higher

function getPrice(args, star) {
    var level = Math.floor(args.level / 10) * 10;
    var base;
    if (star < 10) {
        base = Math.pow(level, 3) * (star + 1) / 2500;
    } else if (star === 10) {
        base = Math.pow(level, 3) * Math.pow(star + 1, 2.7) / 40000;
    } else if (star === 11) {
        base = Math.pow(level, 3) * Math.pow(star + 1, 2.7) / 22000;
    } else if (star === 12) {
        base = Math.pow(level, 3) * Math.pow(star + 1, 2.7) / 15000;
    } else if (star === 13) {
        base = Math.pow(level, 3) * Math.pow(star + 1, 2.7) / 11000;
    } else if (star === 14) {
        base = Math.pow(level, 3) * Math.pow(star + 1, 2.7) / 7500;
    } else {
        base = Math.pow(level, 3) * Math.pow(star + 1, 2.7) / 20000;
    }
    base = Math.round(base) + 10;
    base *= 100;
    // TODO: these are approximations
    if (star == 17) {
      base *= 1.33;
    } else if (star == 18) {
      base *= 2.85;
    } else if (star == 19) {
      base *= 4.44;
    } else if (star == 21) {
      base *= 1.6;
    }
    var multiplier = 1;
    if (star < 17) {
        multiplier = args.mvpDiscount;
    }
    if ((args.event & events.discount) > 0) {
        multiplier *= 0.7;
    }
    if (args.safeguard[star] && data[star].safeguard && canDestroy(args, star)) {
        multiplier += 2;
    }
    return base * multiplier;
}

function getSuccessRate(args, star) {
    var success = data[star].success;
    if (args.catcher[star]) {
        success *= 1.05;
    }
    if ((args.event & events.guarantee) > 0 && (star === 5 || star === 10 || star === 15)) {
        success = 1;
    }
    return success;
}

function canDestroy(args, star) {
    var result = data[star].destroy && data[star].destroy > 0;
    if ((args.event & events.guarantee) > 0 && (star == 5 || star == 10 || star == 15)) {
        result = false;
    }
    if (args.eventSafeguard && star < 15) {
        result = false
    }
    return result;
}

function calculateRange(args, from, to, results) {
    var result = {
        price: 0,
        destroys: 0,
        noDestroyChance: 1
    };
    var skipEvent = (args.event & events.extra) > 0;
    for (var k = from; k < to; k++) {
        result.price += results[k].price;
        result.destroys += results[k].destroys;
        result.noDestroyChance *= results[k].noDestroyChance;
        if (skipEvent && k <= 10) {
            k++;
        }
    }
    return result;
}

function calculateStep(args, star, results) {
    var price = getPrice(args, star);
    var success = getSuccessRate(args, star);
    var skipEvent = (args.event & events.extra) > 0;
    var step = {};
    
    //special case: at 11 stars and 10 star success gives extra
    if (skipEvent && star === 11) {
        step.price = price + (1 - success) * results[star - 1].price;
        step.destroys = 0;
        step.noDestroyChance = 1;
        results[star] = step;
        return step;
    }

    //calculate cost of failure
    //given: already 1 failure
    var failureTable = [];
    var remainingRate = 1;
    var entry;
    if (canDestroy(args, star) && !(args.safeguard[star] && data[star].safeguard)) {
        //scenario: failure is a destroy
        entry = {
            weight: remainingRate * data[star].destroy * (
              ((args.event & events.boomchance) > 0 && star < 21) ? 0.7 : 1),
            price: price,
            destroys: 1,
            noDestroyChance: 0
        };
        if (star > destroyStar) {
            var range = calculateRange(args, destroyStar, star, results);
            entry.price += range.price;
            entry.destroys += range.destroys;
        }
        failureTable.push(entry);
        remainingRate -= entry.weight;
    }
    if (data[star].drop) {
        //scenario: failure is a drop
        if (data[star - 1].drop) {
            //if (we can still drop more)
            //scenario: success immediately after failing
            var dropPrice = getPrice(args, star - 1);
            var dropSuccess = getSuccessRate(args, star - 1);
            entry = {
                weight: remainingRate * dropSuccess,
                price: dropPrice + price,
                destroys: 0,
                noDestroyChance: 1
            };
            failureTable.push(entry);
            remainingRate -= entry.weight;
            if (canDestroy(args, star - 1) && !(args.safeguard[star - 1] && data[star - 1].safeguard)) {
                //scenario: destroy right after failing
                entry = {
                    weight: remainingRate * data[star - 1].destroy,
                    price: dropPrice + price,
                    destroys: 1,
                    noDestroyChance: 0
                };
                if (star > destroyStar) {
                    var range = calculateRange(args, destroyStar, star, results);
                    entry.price += range.price;
                    entry.destroys += range.destroys;
                }
                failureTable.push(entry);
                remainingRate -= entry.weight;
            }
            //scenario: drop a second time and activate chance time (as of savior this will never get called)
            if (skipEvent && star - 2 <= 10) {
                entry = {
                    weight: remainingRate,
                    price: getPrice(args, star - 2) + dropPrice + price,
                    destroys: 0,
                    noDestroyChance: 1
                };
            } else {
                entry = {
                    weight: remainingRate,
                    price: getPrice(args, star - 2) + dropPrice + price + results[star - 1].price,
                    destroys: results[star - 1].destroys,
                    noDestroyChance: results[star - 1].noDestroyChance
                };
            }
            failureTable.push(entry);
            remainingRate -= entry.weight;
        } else {
            //if (we can't drop anymore)
            entry = {
                weight: remainingRate,
                price: price + results[star - 1].price,
                destroys: results[star - 1].destroys,
                noDestroyChance: results[star - 1].noDestroyChance
            };
            failureTable.push(entry);
            remainingRate -= entry.weight;
        }
    } else {
        //scenario: failure is a keep
        entry = {
            weight: remainingRate,
            price: price,
            destroys: 0,
            noDestroyChance: 1
        };
        failureTable.push(entry);
        remainingRate -= entry.weight;
    }
    var failurePrice = 0;
    var failureDestroys = 0;
    var destroyChance = 0;
    for (var k = 0; k < failureTable.length; k++) {
        var entry = failureTable[k];
        failurePrice += entry.weight * entry.price;
        failureDestroys += entry.weight * entry.destroys;
        destroyChance += entry.weight * (1 - entry.noDestroyChance);
    }

    //calculate average cost
    var numFailures = (1 - success) / success;
    step.price = price + failurePrice * numFailures;
    step.destroys = failureDestroys * numFailures;
    //step.noDestroyChance = Math.pow(1 - destroyChance, numFailures);
    step.noDestroyChance = success / (success + destroyChance - success * destroyChance);

    results[star] = step;
    return step;
}

function calculate() {
    try {
        var args = {};
        args.event = events[document.getElementById('event').value];
        args.eventSafeguard = false;
        args.mvpDiscount = mvp[document.getElementById('mvp').value];
        args.level = parseInt(document.getElementById('level').value);
        var from = parseInt(document.getElementById('from').value);
        var to = parseInt(document.getElementById('to').value);

        args.safeguard = {};
        for (var k = 0; k < 30; k++) {
            args.safeguard[k] = false;
        }
        if (document.getElementById('safeguard').checked) {
            var safeguardStars = document.getElementById('safeguard-stars').querySelectorAll('input');
            for (var k = 0; k < safeguardStars.length; k++) {
                if (safeguardStars[k].checked) {
                    var safeguardStar = parseInt(safeguardStars[k].id.split('-')[1]);
                    args.safeguard[safeguardStar] = true;
                }
            }
        }

        args.catcher = {};
        for (var k = 0; k < 30; k++) {
            args.catcher[k] = false;
        }
        if (document.getElementById('catcher').checked) {
            var catcherStars = document.getElementById('catcher-stars').querySelectorAll('input[type=checkbox]');
            for (var k = 0; k < catcherStars.length; k++) {
                if (catcherStars[k].checked) {
                    var catcherStar = parseInt(catcherStars[k].id.split('-')[1]);
                    if (catcherStar < 15) {
                        catcherStar = 5 * Math.floor(catcherStar / 5);
                        for (var j = 0; j < 5; j++) {
                            args.catcher[catcherStar + j] = true;
                        }
                    } else {
                        args.catcher[catcherStar] = true;
                    }
                }
            }
        }

        var results = [];
        for (var k = 0; k < to; k++) {
            calculateStep(args, k, results);
        }
        var result = calculateRange(args, from, to, results);
        var resultFrom12 = result;
        if (from != 12 && to > 12) {
            resultFrom12 = calculateRange(args, 12, to, results);
        }

        var resultDiv = document.getElementById('results');
        resultDiv.hidden = true;
        document.getElementById('cost-average').innerHTML = result.price.toLocaleString();
        document.getElementById('destroy-average').innerHTML = result.destroys;

        document.getElementById('destroy-details').hidden = true;
        if (result.noDestroyChance < 1) {
            document.getElementById('destroy-chance').innerHTML = ((1 - result.noDestroyChance) * 100).toLocaleString();
            function getPercentile(percentile) {
                var base = 1 - resultFrom12.noDestroyChance;
                var value = (1 - percentile) / (1 - result.noDestroyChance);
                return Math.ceil(Math.log(value) / Math.log(base));
            }
            document.getElementById('destroy-percent-25').innerHTML = getPercentile(0.25);
            document.getElementById('destroy-percent-50').innerHTML = getPercentile(0.5);
            document.getElementById('destroy-percent-75').innerHTML = getPercentile(0.75);
            document.getElementById('destroy-percent-95').innerHTML = getPercentile(0.95);
            var canvas = document.getElementById('destroy-graph');
            drawDestroyGraph(canvas, result.noDestroyChance, resultFrom12.noDestroyChance);
            document.getElementById('destroy-details').hidden = false;
        }

        resultDiv.hidden = false;
    } catch (e) {
        console.error(e);
    }
}

function drawDestroyGraph(canvas, noDestroyChance, noDestroyFrom12Chance) {
    const numSamples = 10;
    var moreDestroyChance = 1 - noDestroyChance;
    var destroyChances = [ noDestroyChance ];
    for (var k = 0; k < numSamples; k++) {
        moreDestroyChance *= 1 - noDestroyFrom12Chance;
        destroyChances.push(1 - moreDestroyChance);
    }

    var context = canvas.getContext('2d');
    context.reset();
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineCap = 'square';
    context.font = '12px sans-serif';
    const topPadding = 40;
    const padding = 60;
    context.beginPath();
    context.moveTo(padding + 0.5, topPadding + 0.5);
    context.lineTo(padding + 0.5, canvas.height - padding - 0.5);
    context.lineTo(canvas.width - 0.5, canvas.height - padding - 0.5);
    context.stroke();

    var percents = [ 0.25, 0.5, 0.75, 0.95 ];
    context.fillStyle = 'black';
    context.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    for (var percent of percents) {
        var height = (canvas.height - topPadding - padding) * (1 - percent);
        height = topPadding + Math.floor(height) + 0.5;
        context.beginPath();
        context.moveTo(padding + 0.5, height);
        context.lineTo(canvas.width - 0.5, height);
        context.stroke();
        var text = (100 * percent) + '%';
        var textWidth = context.measureText(text).width;
        context.fillText(text, padding - 4 - textWidth, height + 5);
    }
    context.beginPath();
    context.moveTo(padding + 0.5, topPadding + 0.5);
    context.lineTo(canvas.width - 0.5, topPadding + 0.5);
    context.stroke();

    for (var k = 0; k <= numSamples; k++) {
        var gradient = context.createLinearGradient(0, 0, topPadding, canvas.height - padding);
        var r = Math.floor(k * 255 / 2 / numSamples);
        var b = 255 - Math.floor(k * 255 / 2 / numSamples);
        gradient.addColorStop(0, `rgb(${1.5 * r}, ${b}, ${b})`);
        gradient.addColorStop(1, `rgb(${r}, 0, ${b})`);
        context.fillStyle = gradient;
        var barHeight = destroyChances[k] * (canvas.height - topPadding - padding);
        context.fillRect(padding + 16 + 32 * k, canvas.height - padding - barHeight, 24, barHeight);
        context.fillStyle = 'black';
        var textWidth = context.measureText(k).width;
        context.fillText(k, padding + 16 + 32 * k + (24 - textWidth) / 2, canvas.height - padding + 16);
    }

    context.font = 'bold 24px sans-serif';
    context.fillStyle = 'black';
    var text = 'Chance of X or Fewer Destroys';
    var textWidth = context.measureText(text).width;
    context.fillText(text, (canvas.width - textWidth) / 2, 30);
    text = 'Destroys';
    textWidth = context.measureText(text).width;
    context.fillText(text, (padding + canvas.width - textWidth) / 2, canvas.height - 10);
    text = 'Percentile';
    context.font = 'bold 16px sans-serif';
    var y = topPadding + (canvas.height - topPadding - padding - 16 * text.length) / 2;
    for (var k = 0; k < text.length; k++) {
        textWidth = context.measureText(text[k]).width;
        context.fillText(text[k], padding / 4 - textWidth / 2, y + 16 * (k + 1));
    }
}

function toggleSafeguard() {
    var safeguard = document.getElementById('safeguard').checked;
    var checkboxes = document.getElementById('safeguard-stars').querySelectorAll('input');
    for (var k = 0; k < checkboxes.length; k++) {
        checkboxes[k].disabled = !safeguard;
    }
}

function toggleCatcher() {
    var catcher = document.getElementById('catcher').checked;
    var elements = document.getElementById('catcher-stars').querySelectorAll('input');
    for (var k = 0; k < elements.length; k++) {
        elements[k].disabled = !catcher;
    }
}

function checkAllCatcher() {
    var checkboxes = document.getElementById('catcher-stars').querySelectorAll('input[type=checkbox]');
    for (var k = 0; k < checkboxes.length; k++) {
        checkboxes[k].checked = true;
    }
}

function uncheckAllCatcher() {
    var checkboxes = document.getElementById('catcher-stars').querySelectorAll('input[type=checkbox]');
    for (var k = 0; k < checkboxes.length; k++) {
        checkboxes[k].checked = false;
    }
}
