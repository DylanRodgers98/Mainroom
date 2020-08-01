const express = require('express');
const router = express.Router();
const filters = require('../json/filters.json');

router.get('/', (req, res) => {
    res.json({
        genres: Array.from(filters.genres).sort(),
        categories: Array.from(filters.categories).sort()
    });
});

router.get('/genres', (req, res) => {
    res.json({
        genres: Array.from(filters.genres).sort()
    });
});

router.get('/categories', (req, res) => {
    res.json({
        categories: Array.from(filters.categories).sort()
    });
});

module.exports = router;