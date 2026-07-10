async function listTargets() {
  try {
    const res = await fetch('http://127.0.0.1:9222/json/list');
    const targets = await res.json();
    console.log(JSON.stringify(targets, null, 2));
  } catch (err) {
    console.error('Failed to list targets:', err);
  }
}
listTargets();
