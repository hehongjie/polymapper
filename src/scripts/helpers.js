function googlifyPoint(point) {
  return { lat: point[0], lng: point[1] };
}

function ungooglifyPoint(point) {
  return [point.lat(), point.lng()];
}

function calculateSquareCoordinates(map) {
  const MAP_WIDTH = 256; // https://developers.google.com/maps/documentation/javascript/coordinates
  const topRight = map.getProjection().fromLatLngToPoint(map.getBounds().getNorthEast());
  const bottomLeft = map.getProjection().fromLatLngToPoint(map.getBounds().getSouthWest());
  if (topRight.x <= bottomLeft.x) {
    topRight.x += MAP_WIDTH;
  }
  const least = Math.min(Math.abs(topRight.x - bottomLeft.x), Math.abs(topRight.y - bottomLeft.y));
  const size = least / (2 * NEW_POLYGON_RATIO);
  const center = { x: (topRight.x + bottomLeft.x) / 2, y: (topRight.y + bottomLeft.y) / 2 };
  const points = [
    [center.x - size, center.y - size], [center.x - size, center.y + size],
    [center.x + size, center.y + size], [center.x + size, center.y - size]
  ];
  return points
    .map(p => {
      const point = new google.maps.Point(p[0] < MAP_WIDTH ? p[0] : p[0] - MAP_WIDTH, p[1]);
      return ungooglifyPoint(map.getProjection().fromPointToLatLng(point));
    });
}

function download(filename, text) {
  const a = document.createElement('a');
  a.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  a.setAttribute('download', filename);
  a.style.display = 'none';
  document.body.append(a);
  a.click();
  document.body.removeChild(a);
}