// comments disabled?
var commentsDisabled = $('#comments-disabled');
if (commentsDisabled.size() > 0 && commentsDisabled.text() == 'Yes') {
    $('#comments-area').remove();
}

// comments
var comments = $('#page-comments');
if (comments.size() > 0) {

    // get elements
    var commentsform = $('#page-comment-form');
    var submitlabel = $('#comment-submit').text();
    var cancellabel = $('#cancel-reply').text();

    // cancel replies
    comments.on('cancelreplies', function (e) {
        comments.find('li.replying,li.editing').removeClass('replying editing');
        $('#comment-replyto').val('0');
        $('#comment-edit').val('0');
        $('#comment-body').val('').removeClass('with-error');
        $('#comment-submit').text(submitlabel);
        $('#cancel-reply').text(cancellabel);
        $('#add-a-comment').show().after(commentsform);
    });

    // get comments
    comments.on('getcomments', function (e) {
        $.ajax({
            url: bones.site.collection.url + "/_api/web/lists/GetByTitle('Comments')/items?$select=ID,Author/Title,Author/ID,Created,CommentBody,ReplyID/ID&$expand=Author/Title,Author/ID,ReplyID&$orderby=Created asc&$filter=PageID eq " + bones.page.id + " and CommentWeb eq '" + (bones.site.web.relative === '' ? '/' : bones.site.web.relative) + "'",
            method: 'GET',
            headers: {
                'accept': 'application/json;odata=verbose',
                'X-RequestDigest': bones.digest
            },
            success: function (data) {

                // clear loading
                comments.empty();

                // comment count
                $('#comments').text((data.d.results.length > 0 ? data.d.results.length : 'No') + ' Comment' + (data.d.results.length != 1 ? 's' : ''));

                // comments
                if (data.d.results.length > 0) {

                    // create <ol>
                    var ol = $('<ol class="comments-list"/>');
                    comments.append(ol);

                    // each comment
                    $.each(data.d.results, function (i, comment) {

                        // create <li>
                        var li = $('<li id="comment-' + comment.ID + '"/>');

                        // add author
                        li.append('<div class="comment-author">' + comment.Author.Title + ' <time class="comment-date" datetime="' + comment.Created + '" title="' + comment.Created + '">posted ' + $.timeago(comment.Created) + '</time></div>');

                        // add body
                        li.append('<div class="comment-body">' + comment.CommentBody + '</div>');

                        // comment tools
                        var tools = $('<div class="comment-tools"></div>');

                        // reply
                        var reply = $('<a href="#reply" title="Reply"><i class="fa fa-reply"></i><span class="sr-only">Reply to this comment</span></a>');
                        reply.on('click', function (e) {
                            e.preventDefault();

                            // cancel active replies
                            comments.trigger('cancelreplies');

                            // add class
                            li.addClass('replying');

                            // hide comment label
                            $('#add-a-comment').hide();

                            // set replyto value
                            $('#comment-replyto').val(comment.ID);

                            // move comment form
                            li.children('.comment-tools').after(commentsform);

                        });
                        tools.append(reply);

                        // comment owner?
                        if (comment.Author.ID == bones.user.id) {

                            // edit
                            var edit = $('<a href="#edit" title="Edit"><i class="fa fa-pencil"></i><span class="sr-only">Edit this comment</span></a>');
                            edit.on('click', function (e) {
                                e.preventDefault();

                                // cancel active replies
                                comments.trigger('cancelreplies');

                                // add class
                                li.addClass('editing');

                                // hide comment label
                                $('#add-a-comment').hide();

                                // set replyto value
                                $('#comment-replyto').val(comment.ReplyID.ID);

                                // set edit value
                                $('#comment-edit').val(comment.ID);

                                // set body value
                                $('#comment-body').val(comment.CommentBody);

                                // update button labels
                                $('#comment-submit').text('Save Changes');
                                $('#cancel-reply').text('Cancel');

                                // move comment form
                                li.children('.comment-tools').after(commentsform);

                            });
                            tools.append(edit);

                            // delete
                            var del = $('<a class="delete-comment" href="#delete" title="Delete"><i class="fa fa-trash-o"></i><span class="sr-only">Delete this comment</span></a>');
                            del.on('click', function (e) {
                                e.preventDefault();

                                // cancel active replies
                                comments.trigger('cancelreplies');

                                // confirm
                                var c = confirm('Are you sure you want to delete this comment and its replies?');

                                // confirmed?
                                if (c) {

                                    // delete
                                    $.ajax({
                                        url: bones.site.collection.url + "/_api/web/lists/GetByTitle('Comments')/items(" + comment.ID + ")",
                                        method: 'POST',
                                        headers: {
                                            'X-RequestDigest': bones.digest,
                                            'X-HTTP-Method': 'DELETE',
                                            'IF-MATCH': '*'
                                        },
                                        success: function (data) {

                                            // get comments
                                            comments.trigger('getcomments');

                                        },
                                        error: function () {

                                            // error message
                                            commentsform.append('<div class="comments-error">Unable to delete comment. Please try again later.</div>');

                                        }
                                    });

                                }

                            });
                            tools.append(del);

                        }

                        // not owner
                        else {

                            // flag
                            var flag = $('<a class="flag-comment" href="#flag" title="Flag as Inappropriate"><i class="fa fa-flag"></i><span class="sr-only">Flag this comment as inappropriate</span></a>');
                            flag.on('click', function (e) {
                                e.preventDefault();

                                // cancel active replies
                                comments.trigger('cancelreplies');

                                // confirm
                                var c = confirm('Flag this comment as inappropriate or offensive?');

                                // confirmed?
                                if (c) {

                                    // post data
                                    var postdata = {
                                        '__metadata': {
                                            'type': 'SP.Data.FlaggedCommentsListItem'
                                        },
                                        'CommentID': comment.ID.toString(),
                                        'CommentUrl': bones.site.collection.url + bones.page.physical + '#comment-' + comment.ID,
                                        'CommentBody': comment.CommentBody + '<div class="comment-actions flagged-comment-actions"><button class="delete-flagged-comment" data-comment-id="' + comment.ID + '">Delete</button><button class="keep-flagged-comment">Keep</button></div>'
                                    };

                                    // create flag
                                    $.ajax({
                                        url: bones.site.collection.url + "/_api/web/lists/GetByTitle('FlaggedComments')/items",
                                        method: 'POST',
                                        contentType: 'application/json;odata=verbose',
                                        data: JSON.stringify(postdata),
                                        headers: {
                                            'accept': 'application/json;odata=verbose',
                                            'X-RequestDigest': bones.digest
                                        },
                                        success: function (data) {
                                            flag.closest('li').addClass('flagged-comment');
                                            flag.remove();
                                        },
                                        error: function () {
                                            flag.children('i').attr('class', 'fa fa-exclamation-triangle').attr('title', 'Error flagging comment! Try that again in a few moments');
                                        }
                                    });

                                }

                            });
                            tools.append(flag);

                        }

                        // add tools
                        li.append(tools);

                        // reply to?
                        if (comment.ReplyID.ID) {

                            // add to comment
                            var ocomment = ol.find('li#comment-' + comment.ReplyID.ID);

                            // found reply-to comment?
                            if (ocomment.size() > 0) {

                                // existing child <ol>?
                                var childol = ocomment.children('ol');

                                // add to existing <ol>
                                if (childol.size() > 0) {
                                    childol.append(li);
                                }

                                // new <ol>
                                else {
                                    var newol = $('<ol/>');
                                    newol.append(li);
                                    ocomment.append(newol);
                                }

                            }

                            // not found, add to <ol>
                            else {
                                ol.append(li);
                            }

                        }

                        // add to <ol>
                        else {
                            ol.append(li);
                        }

                    });

                }

                // no comments
                else {
                    comments.append('<div class="comments-empty">No comments.</div>');
                }

            },
            error: function () {

                comments.empty().append('<div class="comments-error">Unable to load comments. Please try again later.</div>');

            }
        });
    });
    comments.trigger('getcomments');

    // comment form
    if (commentsform.size() > 0) {

        // get inputs
        var replyto = $('#comment-replyto');
        var editno = $('#comment-edit');
        var body = $('#comment-body');

        // clear form
        commentsform.on('clearform', function (e) {
            replyto.val('0');
            editno.val('0');
            body.val('');
            comments.trigger('cancelreplies');
        });

        // submit
        $('#comment-submit').on('click', function (e) {
            e.preventDefault();

            // disable
            $(this).text('Saving...').attr('disabled', 'disabled');

            // remove errors
            body.removeClass('with-error');
            commentsform.find('.comments-error').remove();

            // get values
            var bodycontent = $.trim(body.val());
            var replyval = parseInt(replyto.val());
            var editval = parseInt(editno.val());

            // response data
            var postdata = {
                '__metadata': {
                    'type': 'SP.Data.CommentsListItem'
                },
                'PageID': bones.page.id.toString(),
                'CommentWeb': bones.site.web.relative === '' ? '/' : bones.site.web.relative,
                'CommentBody': $('<div/>').text(bodycontent).html()
            };

            // reply?
            if (replyval > 0) {
                postdata.ReplyIDId = replyval;
            }

            // valid
            if (bodycontent.length > 0) {

                // new comment
                if (editval <= 0) {
                    $.ajax({
                        url: bones.site.collection.url + "/_api/web/lists/GetByTitle('Comments')/items",
                        method: 'POST',
                        contentType: 'application/json;odata=verbose',
                        data: JSON.stringify(postdata),
                        headers: {
                            'accept': 'application/json;odata=verbose',
                            'X-RequestDigest': bones.digest
                        },
                        success: function (data) {

                            // enable
                            $('#comment-submit').text(submitlabel).removeAttr('disabled');

                            // clear form
                            commentsform.trigger('clearform');

                            // get comments
                            comments.trigger('getcomments');

                        },
                        error: function () {

                            // enable
                            $('#comment-submit').text(submitlabel).removeAttr('disabled');

                            // error message
                            commentsform.append('<div class="comments-error">Unable to add comment. Please try again later.</div>');

                        }
                    });
                }

                // edit comment
                else {
                    $.ajax({
                        url: bones.site.collection.url + "/_api/web/lists/GetByTitle('Comments')/items(" + editval.toString() + ")",
                        method: 'POST',
                        contentType: 'application/json;odata=verbose',
                        data: JSON.stringify(postdata),
                        headers: {
                            'accept': 'application/json;odata=verbose',
                            'X-RequestDigest': bones.digest,
                            'X-HTTP-Method': 'MERGE',
                            'IF-MATCH': '*'
                        },
                        success: function (data) {

                            // enable
                            $('#comment-submit').text(submitlabel).removeAttr('disabled');

                            // clear form
                            commentsform.trigger('clearform');

                            // get comments
                            comments.trigger('getcomments');

                        },
                        error: function () {

                            // enable
                            $('#comment-submit').text(submitlabel).removeAttr('disabled');

                            // error message
                            commentsform.append('<div class="comments-error">Unable to edit comment. Please try again later.</div>');

                        }
                    });
                }

            }

            // invalid
            else {
                $('#comment-submit').text(submitlabel).removeAttr('disabled');
                body.addClass('with-error').appendTo(body.parent());
            }

        });

        // cancel reply
        $('#cancel-reply').on('click', function (e) {
            e.preventDefault();
            comments.trigger('cancelreplies');
        });

    }

}

// delete flagged comment
$('button.delete-flagged-comment').on('click', function (e) {
    e.preventDefault();
    var button = $(this);
    var id = parseInt(button.attr('data-comment-id'));
    $.ajax({
        url: bones.site.collection.url + "/_api/web/lists/GetByTitle('Comments')/items(" + id + ")",
        method: 'POST',
        headers: {
            'X-RequestDigest': bones.digest,
            'X-HTTP-Method': 'DELETE',
            'IF-MATCH': '*'
        },
        success: function (data) {
            button.siblings('.keep-flagged-comment').trigger('click');
            button.remove();
        },
        error: function () {
            button.siblings('.keep-flagged-comment').trigger('click');
            button.remove();
        }
    });
});

// keep flagged content
$('button.keep-flagged-comment').on('click', function (e) {
    e.preventDefault();
    var button = $(this);
    var id = parseInt(button.closest('td').siblings('td:last').text());
    $.ajax({
        url: bones.site.collection.url + "/_api/web/lists/GetByTitle('FlaggedComments')/items(" + id + ")",
        method: 'POST',
        headers: {
            'X-RequestDigest': bones.digest,
            'X-HTTP-Method': 'DELETE',
            'IF-MATCH': '*'
        },
        success: function (data) {
            button.closest('.comment-actions').remove();
            location.reload();
        },
        error: function () {
            button.closest('.comment-actions').remove();
            location.reload();
        }
    });
});
