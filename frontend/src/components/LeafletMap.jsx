import { useEffect, useRef } from "react";
import L from "leaflet";

function pinIcon(color, glyph) {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;transform:translate(-50%,-100%)">
      <div style="width:30px;height:30px;background:${color};border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center">
        <span style="transform:rotate(45deg);color:#fff;font-size:14px;font-weight:700">${glyph}</span>
      </div></div>`,
    iconSize: [30, 30],
    iconAnchor: [0, 0],
  });
}

const ICONS = {
  kitchen: () => pinIcon("#EA580C", "K"),
  customer: () => pinIcon("#16A34A", "C"),
  rider: () => pinIcon("#2563EB", "R"),
};

export function LeafletMap({
  center,
  zoom = 14,
  markers = [],
  radiusKm,
  radiusCenter,
  draggable = false,
  onMove,
  height = 300,
  className = "",
}) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (mapRef.current || !elRef.current) return;
    const map = L.map(elRef.current, { zoomControl: true, attributionControl: false }).setView(
      center || [19.076, 72.8777],
      zoom
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    if (draggable) {
      map.on("click", (e) => onMove && onMove(e.latlng.lat, e.latlng.lng));
    }
    setTimeout(() => map.invalidateSize(), 200);
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line
  }, []);

  // recenter
  useEffect(() => {
    if (mapRef.current && center) mapRef.current.setView(center, mapRef.current.getZoom());
  }, [center?.[0], center?.[1]]);

  // draw markers / circle / pin
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (radiusKm && radiusCenter) {
      L.circle(radiusCenter, {
        radius: radiusKm * 1000,
        color: "#EA580C",
        fillColor: "#EA580C",
        fillOpacity: 0.08,
        weight: 1.5,
      }).addTo(layer);
    }

    markers.forEach((m) => {
      const icon = ICONS[m.type] ? ICONS[m.type]() : ICONS.customer();
      const mk = L.marker([m.lat, m.lng], { icon }).addTo(layer);
      if (m.label) mk.bindTooltip(m.label, { direction: "top", offset: [0, -28] });
    });

    if (draggable && center) {
      const mk = L.marker(center, { draggable: true, icon: ICONS.customer() }).addTo(layer);
      mk.on("dragend", (e) => {
        const ll = e.target.getLatLng();
        onMove && onMove(ll.lat, ll.lng);
      });
    }
    // eslint-disable-next-line
  }, [JSON.stringify(markers), radiusKm, radiusCenter?.[0], radiusCenter?.[1], center?.[0], center?.[1], draggable]);

  return <div ref={elRef} style={{ height }} className={className} data-testid="leaflet-map" />;
}
