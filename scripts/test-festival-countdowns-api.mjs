const response = await fetch("http://localhost:8080/api/admin/festival-countdowns");
console.log(`Unauthenticated HTTP ${response.status}`);
if (response.status !== 401) process.exitCode = 1;
