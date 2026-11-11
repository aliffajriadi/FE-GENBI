// ID perangkat untuk binding 1 akun = 1 device (PRD bagian 5).
export function deviceId() {
  try {
    let id = localStorage.getItem("deviceId");
    if (!id) localStorage.setItem("deviceId", (id = `web-${crypto.randomUUID()}`));
    return id;
  } catch {
    return "web-unknown";
  }
}

export function currentPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}
