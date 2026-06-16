let lap = 1;

setInterval(() => {

    lap++;

    if (lap > 57) {
        lap = 1;
    }

    document.getElementById("lapCounter").innerText = lap;

}, 1000);