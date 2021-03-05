import React, {Fragment} from 'react';
import {
    EmailIcon,
    EmailShareButton,
    FacebookIcon,
    FacebookMessengerIcon,
    FacebookMessengerShareButton,
    FacebookShareButton, RedditIcon, RedditShareButton, TumblrIcon, TumblrShareButton, TwitterIcon,
    TwitterShareButton, WhatsappIcon, WhatsappShareButton
} from 'react-share';

export default class SocialShareButtons extends React.Component {

    render() {
        return (
            <Fragment>
                <FacebookShareButton className='m-1' url={window.location.href}>
                    <FacebookIcon size={58} round/>
                </FacebookShareButton>
                <FacebookMessengerShareButton className='m-1' url={window.location.href}>
                    <FacebookMessengerIcon size={58} round/>
                </FacebookMessengerShareButton>
                <TwitterShareButton className='m-1' url={window.location.href}>
                    <TwitterIcon size={58} round/>
                </TwitterShareButton>
                <WhatsappShareButton className='m-1' url={window.location.href}>
                    <WhatsappIcon size={58} round/>
                </WhatsappShareButton>
                <RedditShareButton className='m-1' url={window.location.href}>
                    <RedditIcon size={58} round/>
                </RedditShareButton>
                <TumblrShareButton className='m-1' url={window.location.href}>
                    <TumblrIcon size={58} round/>
                </TumblrShareButton>
                <EmailShareButton className='m-1' url={window.location.href}>
                    <EmailIcon size={58} round/>
                </EmailShareButton>
            </Fragment>
        );
    }

}