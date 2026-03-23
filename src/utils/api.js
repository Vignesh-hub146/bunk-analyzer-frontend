import axios from 'axios';

const BASE = '/api/bunk';

export async function analyzeAttendance(data) {
  const r = await axios.post(`${BASE}/analyze`, data);
  return r.data;
}

export async function fetchBatches() {
  const r = await axios.get(`${BASE}/timetable/batches`);
  return r.data;
}

export async function fetchBatch(id) {
  const r = await axios.get(`${BASE}/timetable/batch/${id}`);
  return r.data;
}

export async function fetchLatestTimetable() {
  const r = await axios.get(`${BASE}/timetable/latest`);
  return r.data;
}

export async function fetchLatestSubjects() {
  const r = await axios.get(`${BASE}/subjects/latest`);
  return r.data;
}

export async function deleteBatch(id) {
  const r = await axios.delete(`${BASE}/timetable/batch/${id}`);
  return r.data;
}

export async function healthCheck() {
  const r = await axios.get(`${BASE}/health`);
  return r.data;
}