// Initialize the Leaflet map centered on Vancouver with zoom level 10
const map = L.map('map').setView([49.2827, -123.1207], 10);
// Step 21: Add city search and autocomplete functionality
let currentMarker = null;

const input = document.getElementById('city-input');
const suggestions = document.getElementById('suggestions');

input.addEventListener('input', () => {
    const query = input.value.trim();
    if (query.length < 3) {
        suggestions.innerHTML = '';
        return;
    }

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
        .then(res => res.json())
        .then(data => {
            suggestions.innerHTML = '';
            data.forEach(place => {
                const li = document.createElement('li');
                li.textContent = `${place.display_name}`;
                li.style.cursor = 'pointer';
                li.addEventListener('click', () => {
                    input.value = place.display_name;
                    suggestions.innerHTML = '';
                    const lat = parseFloat(place.lat);
                    const lon = parseFloat(place.lon);
                    localStorage.setItem('lastCityLat', lat);
                    localStorage.setItem('lastCityLon', lon);
                    localStorage.setItem('lastCityName', place.display_name);
                    loadAirQuality(lat, lon, place.display_name);
                });
                suggestions.appendChild(li);
            });
        });
});


// Add OpenStreetMap tile layer to the map with attribution
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
});

const stamen = L.tileLayer('https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg', {
    attribution: 'Map tiles by Stamen Design, under CC BY 3.0 — Map data © OpenStreetMap',
    maxZoom: 18
});

const positron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors & CartoDB',
    subdomains: 'abcd',
    maxZoom: 19
});

const opentopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
    maxZoom: 17
});

const esriImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; Esri, Maxar, Earthstar Geographics, and the GIS community',
    maxZoom: 19
});

const maptilerHybrid = L.tileLayer('https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=7RRzGnuM7g7hJ2Jv9gYF', {
    attribution: '&copy; MapTiler, OpenStreetMap contributors',
    maxZoom: 20
});




// Add OSM as default
osm.addTo(map);

// Add layer switcher
const baseMaps = {
    "OpenStreetMap": osm,
    "Stamen Terrain": stamen,
    "CartoDB Positron": positron,
    "OpenTopoMap": opentopo,
    "Esri World Imagery": esriImagery,
    "MapTiler Hybrid": maptilerHybrid

};

L.control.layers(baseMaps).addTo(map);


// Step 22: Create a loadAirquality(lat, lon) function in map.js
// Fetch air quality data from the backend API endpoint
function loadAirQuality(lat, lon, cityName = 'Selected Location') { // Step 25.B: Add cityName parameter to display in popup
    localStorage.setItem('lastCityLat', lat); // Save last city latitude in localStorage : Step 24.A
    localStorage.setItem('lastCityLon', lon); // Save last city longitude in localStorage : Step 24.A
    //localStorage.setItem('lastCityName', place.display_name); // Save last city name in localStorage : Step 26.A

    fetch(`/api/airquality?lat=${lat}&lon=${lon}`)
        .then(res => res.json())
        .then(data => {
            const values = data.hourly;
            const pm10 = values.pm10[0];
            const pm25 = values.pm2_5[0];
            const co = values.carbon_monoxide[0];

            // Show local fetch time
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = now.toLocaleString('en-GB', { month: 'short' });
            const year = now.getFullYear();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const formattedTime = `${day}-${month}-${year}, ${hours}:${minutes}:${seconds}`;
            document.getElementById('timestamp').textContent = `Last updated: ${formattedTime}`;

            const popupContent = `
                <strong>${cityName} (${lat.toFixed(5)}, ${lon.toFixed(5)})</strong><br>
                <strong>Air Quality:</strong><br>
                PM10: ${pm10}<br>
                PM2.5: ${pm25}<br>
                CO: ${co}
            `;

            // Prepare radar chart data
            const pm10_raw = data.hourly.pm10[0] || 0;
            const pm25_raw = data.hourly.pm2_5[0] || 0;
            const co_raw = data.hourly.carbon_monoxide[0] || 0;

            const radarLabels = ['PM10', 'PM2.5', 'CO'];
            const radarValues = [
                Math.min(pm10_raw / 100, 1),
                Math.min(pm25_raw / 75, 1),
                Math.min(co_raw / 1000, 1)
            ];

            // Destroy old radar chart if exists
            if (Chart.getChart('radarChart')) {
                Chart.getChart('radarChart').destroy();
            }

            // Create radar chart
            new Chart(document.getElementById('radarChart').getContext('2d'), {
                type: 'radar',
                data: {
                    labels: radarLabels,
                    datasets: [{
                        label: 'Air Quality Levels',
                        data: radarValues,
                        backgroundColor: 'rgba(30, 144, 255, 0.3)',
                        borderColor: 'rgba(30, 144, 255, 0.8)',
                        borderWidth: 2,
                        pointBackgroundColor: 'blue'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        r: {
                            angleLines: { color: '#ccc' },
                            grid: { color: '#ddd' },
                            pointLabels: {
                                color: 'black',
                                font: { size: 12 }
                            },
                            ticks: {
                                beginAtZero: true,
                                color: 'black'
                            }
                        }
                    }
                }
            });


            if (currentMarker) {
                currentMarker.remove();
}

            currentMarker = L.marker([lat, lon])
                .addTo(map)
                .bindPopup(popupContent);

            map.setView([lat, lon], map.getZoom());

            // Delay opening only if needed
            setTimeout(() => {
                currentMarker.openPopup();
            }, 150);

            map.setView([lat, lon], map.getZoom());

            // Extract hourly data and labels (limit to first 24 hours)
            const labels = data.hourly.time.slice(0, 24).map(t => {
                const d = new Date(t);
                return `${d.getHours().toString().padStart(2, '0')}:00`;
            });
            const pm10Data = data.hourly.pm10.slice(0, 24);
            const pm25Data = data.hourly.pm2_5.slice(0, 24);
            const coData = data.hourly.carbon_monoxide.slice(0, 24);

            // Helper to draw chart
            function renderChart(canvasId, label, dataset, color) {
                const ctx = document.getElementById(canvasId).getContext('2d');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: label,
                            data: dataset,
                            borderColor: color,
                            backgroundColor: 'rgba(0,0,0,0)',
                            tension: 0.3,
                            pointRadius: 3
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: true } },
                        scales: {
                            y: { beginAtZero: true,
                                ticks: {
                                    color: 'black' // ← Y-axis tick color
                                },
                                title:{
                                    color: 'black' // ← Y-axis label color
                                }
                            },
                            x: {
                                ticks: {
                                    color: 'black', // ← X-axis tick color
                                    autoSkip: true, // Skip some labels for better readability
                                    maxRotation: 0, // Prevent label rotation
                                },
                                title: {
                                    color: 'black' // ← X-axis label color
                                }
                        }
                    }
                }});
                document.getElementById(canvasId).onclick = () => {
                    const modal = document.getElementById('chartModal');
                    const modalCanvas = document.getElementById('modalChart');
                    const closeBtn = document.getElementById('closeModal');

                    // Destroy previous chart if any
                    if (Chart.getChart(modalCanvas)) {
                        Chart.getChart(modalCanvas).destroy();
                    }

                    // Show modal
                    modal.style.display = 'flex';

                    // Create enlarged chart
                    new Chart(modalCanvas.getContext('2d'), {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: label,
                                data: dataset,
                                borderColor: color,
                                backgroundColor: 'rgba(0,0,0,0)',
                                tension: 0.3,
                                pointRadius: 4,
                                borderWidth: 2
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                legend: { display: true }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: { color: 'black' },
                                    title: {
                                        display: true,
                                        text: 'μg/m³',
                                        color: 'black'
                                    }
                                },
                                x: {
                                    ticks: { color: 'black' },
                                    title: {
                                        display: true,
                                        text: 'Hour',
                                        color: 'black'
                                    }
                                }
                            }
                        }
                    });

                    // Close on click
                    closeBtn.onclick = () => modal.style.display = 'none';
                    modal.onclick = (e) => {
                        if (e.target === modal) modal.style.display = 'none';
                    };
                };
            }

            // Clear existing canvas (if already used)
            ['chart-pm10', 'chart-pm25', 'chart-co'].forEach(id => {
                const old = Chart.getChart(id);
                if (old) old.destroy();
            });

            // Draw charts
            renderChart('chart-pm10', 'PM10 (μg/m³)', pm10Data, 'orange');
            renderChart('chart-pm25', 'PM2.5 (μg/m³)', pm25Data, 'red');
            renderChart('chart-co', 'CO (μg/m³)', coData, 'blue');
        });
}

// Step 24.B: Load default city on startup and save last city in localStorage for auto-update to keep showing the last city searched
const savedLat = localStorage.getItem('lastCityLat');
const savedLon = localStorage.getItem('lastCityLon');

if (savedLat && savedLon) {
    const savedName = localStorage.getItem('lastCityName') || 'Selected Location'; // Step 26.B: Use saved city name or default
    loadAirQuality(parseFloat(savedLat), parseFloat(savedLon), savedName); // Step 26.B: Load air quality for saved city

} else {
    loadAirQuality(49.2827, -123.1207); // default: Vancouver
}

// Refresh the map every 15 minutes to update air quality data
setInterval(() => location.reload(), 15 * 60 * 1000); // 15 minutes in milliseconds
// Add a scale control to the map
L.control.scale().addTo(map);
// Add a layer control to the map -> NOT working yet maybe due to no layers being added
//L.control.layers(null, null, { collapsed: false }).addTo(map);

// Enable Click-to-Query functionality on the map
map.on('click', function (e) {
    const lat = parseFloat(e.latlng.lat.toFixed(5));
    const lon = parseFloat(e.latlng.lng.toFixed(5));
    const locationLabel = `Clicked Location (${lat}, ${lon})`;

    localStorage.setItem('lastCityLat', lat);
    localStorage.setItem('lastCityLon', lon);
    localStorage.setItem('lastCityName', locationLabel);

    loadAirQuality(lat, lon, locationLabel);
});
