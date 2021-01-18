const express = require('express');
const router = express.Router();
const {filters} = require('../../mainroom.config');

const genres = filters.genres.sort();
const categories = filters.categories.sort();

router.get('/', (req, res) => {
    res.json({
        genres,
        categories
    });
});

router.get('/genres', (req, res) => {
    res.json({
        genres
    });
});

router.get('/categories', (req, res) => {
    res.json({
        categories
    });
});

module.exports = router;