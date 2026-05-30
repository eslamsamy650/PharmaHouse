// app.get('/users', async (req, res) => {
//   try {
//     const pool = sql.pool; // reuse the connected pool
//     const result = await pool.request().query('SELECT * FROM Users');
//     res.json(result.recordset);
//   } catch (err) {
//     res.status(500).send('Error fetching users: ' + err.message);
//   }
// });
