// -----------------------------------------------------------
// DIGITRAFFIC – Aseman aikataulunäkymä (Vaihtoehto 2)
// Näyttää vain valitun aseman saapuvat/lähtevät junat
// -----------------------------------------------------------

const BASE = "https://rata.digitraffic.fi/api/v1";

const stationSelect = document.getElementById("stationSelect");
const stationSearch = document.getElementById("stationSearch");
const fetchBtn = document.getElementById("fetchTrains");
const trainsList = document.getElementById("trainsList");
const statusEl = document.getElementById("status");

let globalStations = [];

// -----------------------------------------------------------
// 1. Hae kaikki asemat
// -----------------------------------------------------------
async function fetchStations() {
    try {
        const res = await fetch(`${BASE}/metadata/stations`);
        globalStations = await res.json();

        globalStations.sort((a, b) => a.stationName.localeCompare(b.stationName));

        globalStations
            .filter(st => st.passengerTraffic)
            .forEach(st => {
                const opt = document.createElement("option");
                opt.value = st.stationShortCode;
                opt.textContent = `${st.stationName} (${st.stationShortCode})`;
                stationSelect.appendChild(opt);
            });
    } catch (err) {
        console.error(err);
        statusEl.textContent = "Asemahaun virhe.";
    }
}

// -----------------------------------------------------------
// 2. Hae junat asemalle (saapuvat + lähtevät)
// -----------------------------------------------------------
async function fetchStationTrains(stationCode) {
    trainsList.innerHTML = "";
    statusEl.textContent = "Haetaan aseman tietoja…";

    try {
        const url =
            `${BASE}/live-trains?station=${stationCode}&arriving_trains=50&departing_trains=50&include_nonstopping=false`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Junahaun virhe " + res.status);

        const trains = await res.json();

        if (trains.length === 0) {
            statusEl.textContent = "Ei junia tällä hetkellä.";
            return;
        }

        statusEl.textContent = `Löytyi ${trains.length} junaa`;
        renderStationView(trains, stationCode);

    } catch (err) {
        console.error(err);
        statusEl.textContent = "Haku epäonnistui.";
    }
}

// -----------------------------------------------------------
// 3. Näytä asemakohtaiset aikataulut:
//    - Saapuvat
//    - Lähtevät
// -----------------------------------------------------------
function renderStationView(trains, stationCode) {
    trainsList.innerHTML = "";

    const arriving = [];
    const departing = [];

    trains.forEach(train => {
        // Etsi aikataulurivi tälle asemalle
        const row = train.timeTableRows.find(
            r => r.stationShortCode === stationCode && r.commercialStop
        );

        if (!row) return;

        const trainName = `${train.trainType} ${train.trainNumber}`;

        const origin = getStationName(train.timeTableRows[0].stationShortCode);
        const destination = getStationName(
            train.timeTableRows[train.timeTableRows.length - 1].stationShortCode
        );

        const obj = {
            trainName,
            origin,
            destination,
            scheduled: formatTime(row.scheduledTime),
            actual: row.actualTime ? formatTime(row.actualTime) : "-",
            diff: formatDiff(row.differenceInMinutes)
        };

        if (row.type === "ARRIVAL") arriving.push(obj);
        if (row.type === "DEPARTURE") departing.push(obj);
    });

    trainsList.appendChild(buildTable("Saapuvat junat", arriving, "arrival"));
    trainsList.appendChild(buildTable("Lähtevät junat", departing, "depart"));
}

// -----------------------------------------------------------
// 4. Taulukon luonti
// -----------------------------------------------------------
function buildTable(title, data, mode) {
    const section = document.createElement("section");
    section.className = "schedule-block";

    let rows = data
        .map(item => `
            <tr>
                <td>${item.trainName}</td>
                <td>${mode === "arrival" ? item.origin : item.destination}</td>
                <td>${item.scheduled}</td>
                <td>${item.actual}</td>
                <td>${item.diff}</td>
            </tr>
        `)
        .join("");

    if (rows === "") rows = `<tr><td colspan="5">Ei junia</td></tr>`;

    section.innerHTML = `
        <h2>${title}</h2>
        <table class="ttable">
            <thead>
                <tr>
                    <th>Juna</th>
                    <th>${mode === "arrival" ? "Lähtöasema" : "Määränpää"}</th>
                    <th>${mode === "arrival" ? "Saapumisaika" : "Lähtöaika"}</th>
                    <th>Toteutunut</th>
                    <th>Myöhässä</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;

    return section;
}

// -----------------------------------------------------------
// 5. Apufunktiot
// -----------------------------------------------------------
function getStationName(code) {
    const s = globalStations.find(st => st.stationShortCode === code);
    return s ? s.stationName : code;
}

function formatTime(t) {
    return new Date(t).toLocaleTimeString("fi-FI", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatDiff(min) {
    if (min === null || min === 0) return "-";
    return min > 0 ? `+${min} min` : `${min} min`;
}

// Hakukentän suodatus
stationSearch.addEventListener("input", () => {
    const txt = stationSearch.value.toLowerCase();
    const opts = stationSelect.querySelectorAll("option");

    opts.forEach(opt => {
        opt.style.display =
            opt.textContent.toLowerCase().includes(txt) ? "block" : "none";
    });
});

// Hae-painike
fetchBtn.addEventListener("click", () => {
    const code = stationSelect.value;
    if (!code) return alert("Valitse asema.");
    fetchStationTrains(code);
});

// Käynnistys
fetchStations();


