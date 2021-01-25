import React from 'react';
import {Link} from 'react-router-dom';

export const displayGenreAndCategory = ({genre, category}) => (
    <React.Fragment>
        {!genre ? undefined : <span><Link to={`/genre/${genre}`}>{genre}</Link>&nbsp;</span>}
        {!category ? undefined : <Link to={`/category/${category}`}>{category}</Link>}
    </React.Fragment>
);