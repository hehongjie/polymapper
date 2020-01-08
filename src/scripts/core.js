loadMap();
prepareFields();

function loadMap() {
  const url = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=initialize`;

  const script = document.createElement('script');
  script.setAttribute('src', url);
  script.setAttribute('async', '');
  script.setAttribute('defer', '');

  document.head.appendChild(script);
}

function prepareFields() {
  document.querySelectorAll('form.controls-section').forEach(form => {
    form.addEventListener('submit', event => event.preventDefault());
  });

  const markerRadiusField = document.getElementById('marker-radius');
  markerRadiusField.value = DEFAULT_MARKER_RADIUS;
  markerRadiusField.min = MIN_MARKER_RADIUS;
  markerRadiusField.max = MAX_MARKER_RADIUS;

  const markerColorField = document.getElementById('marker-color');
  markerColorField.value = DEFAULT_MARKER_COLOR;

  const polygonColorField = document.getElementById('polygon-color');
  polygonColorField.value = DEFAULT_POLYGON_COLOR;

  for (const type of ['marker', 'polygon']) {
    document.getElementById(`${type}-import`).addEventListener('click', () => {
      document.getElementById(`${type}-import-file`).click();
    });
  }
}

function initialize() {
  const map = new google.maps.Map(document.getElementById('map'), MAP_OPTIONS);
  initializeShapes(map, 'marker');
  initializeShapes(map, 'polygon');
}

function initializeShapes(map, type) {
  const markers = type === 'marker';
  const items = [];

  const getState = markers ? () => null : () => {
    return items.map(item => {
      const path = item.getPath();
      const length = path.getLength();
      const points = [];
      for (let i = 0; i < length; i++) {
        const point = path.getAt(i);
        points.push([point.lat(), point.lng()]);
      }
      return points;
    });
  };

  const updateStateButtons = markers ? () => null : () => {
    document.getElementById(`${type}-undo`).disabled = currentState === 0;
    document.getElementById(`${type}-redo`).disabled = currentState + 1 === states.length;
  };

  const navigateStates = markers ? () => null : shift => {
    saved = false;
    currentState += shift;
    removeAll();
    render(states[currentState]);
    updateStateButtons();
  };

  const logState = markers ? () => null : () => {
    saved = false;
    states.splice(currentState + 1, states.length - currentState - 1);
    states.push(getState());
    currentState++;
    updateStateButtons();
  };

  const states = [];
  let currentState = -1;
  let saved;
  logState();
  saved = true;

  document.getElementById(`${type}-color`).addEventListener('input', () => render());
  document.getElementById(`${type}-display`).addEventListener('input', () => render());

  document.getElementById(`${type}-import-file`).addEventListener('input', event => {
    if (event.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = readerEvent => {
        const text = readerEvent.target.result;
        let json;
        try {
          json = JSON.parse(text);
        } catch(e) {
          alert('Contents of the file are not in the JSON format.');
        }
        if (json) {
          const nv = nonvalid.instance();
          nv.addMatcher('point', v => !nv([v => !nv.number(), v => !nv.number()]));
          nv.addMatcher('polygon', v => !nv([nv.end, v => !nv.point()]) && v.length >= 3);
          if (nv(json, [nv.end, v => !nv[markers ? 'point' : 'polygon']()])) {
            alert(`Please upload JSON with ${markers
              ? 'an array of [lat, lng] points'
              : 'a list of arrays of three or more [lat, lng] points each'
            }.`);
          } else {
            removeAll();
            render(json);
            logState();
            saved = true;
          }
        }
      };
      reader.onerror = () => alert('There was an error reading file.');
      reader.readAsText(event.target.files[0], 'UTF-8');
    }
    event.target.value = '';
  });

  let deleteMode = false;

  if (markers) {
    document.getElementById(`${type}-radius`).addEventListener('input', event => {
      if (Number(event.target.value)) {
        render();
      }
    });
  } else {
    window.addEventListener('beforeunload', event => {
      if (!saved) {
        event.preventDefault();
        event.returnValue = '';
      }
    });

    document.getElementById(`${type}-editable`).addEventListener('input', () => render());

    document.getElementById(`${type}-create`).addEventListener('click', () => {
      render([calculateSquareCoordinates(map)]);
      logState();
    });

    document.getElementById(`${type}-delete`).addEventListener('click', event => {
      deleteMode = !deleteMode;
      if (deleteMode) {
        event.target.classList.add('on');
      } else {
        event.target.classList.remove('on');
      }
    });

    document.getElementById(`${type}-export`).addEventListener('click', () => {
      download('polygons.json', JSON.stringify(getState()));
      saved = true;
    });

    document.getElementById(`${type}-undo`).addEventListener('click', () => navigateStates(-1));
    document.getElementById(`${type}-redo`).addEventListener('click', () => navigateStates(1));
  }

  const removeAll = () => {
    items.forEach(item => item.setMap(null));
    items.splice(0, items.length);
  };

  const render = (extraFeatures = null) => {
    const color = document.getElementById(`${type}-color`).value;
    const displayed = document.getElementById(`${type}-display`).checked;
    const editable = markers ? false : document.getElementById(`${type}-editable`).checked;
    const radius = markers
      ? Number(document.getElementById(`${type}-radius`).value) || DEFAULT_MARKER_RADIUS
      : null;

    const options = {
      radius: markers ? radius * RADIUS_COEFFICIENT : undefined,
      strokeColor: color,
      strokeWeight: 1,
      strokeOpacity: markers ? MARKER_STROKE_OPACITY : POLYGON_STROKE_OPACITY,
      fillColor: color,
      fillOpacity: markers ? MARKER_FILL_OPACITY : POLYGON_FILL_OPACITY,
      visible: displayed,
      zIndex: markers ? 2 : (editable ? 3 : 1),
      editable: editable,
      draggable: editable
    };

    if (extraFeatures) {
      for (const feature of extraFeatures) {
        const geometry = markers
          ? { center: googlifyPoint(feature) }
          : { paths: feature.map(googlifyPoint) };
        const item = new (markers ? google.maps.Circle : google.maps.Polygon)({
          ...geometry,
          ...options
        });
        item.setMap(map);
        items.push(item);
        if (!markers) {
          google.maps.event.addListener(item, 'click', () => {
            if (deleteMode && confirm('Are you sure you want to delete the polygon?')) {
              item.setMap(null);
              items.splice(items.indexOf(item), 1);
              logState();
            }
          });
          const path = item.getPath();
          let dragging = false;
          google.maps.event.addListener(path, 'insert_at', () => logState());
          google.maps.event.addListener(path, 'remove_at', () => logState());
          google.maps.event.addListener(path, 'set_at', () => {
            if (!dragging) {
              logState();
            }
          });
          google.maps.event.addListener(item, 'dragstart', () => {
            dragging = true;
          });
          google.maps.event.addListener(item, 'dragend', () => {
            dragging = false;
            logState();
          });
        }
      }
    } else {
      for (const item of items) {
        item.setOptions(options);
      }
    }
  };
}