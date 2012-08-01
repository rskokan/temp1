/*
 * Copyright Radek Skokan (Solucs) 2012
 * 
 * Crappy code, my 1st JavaScript toy...
 */

// TODO: Why the jQuery way doesn't work?
// $(document).bind("deviceready", onDeviceReady);
// $(document).on("deviceready", onDeviceReady);
document.addEventListener("deviceready", onDeviceReady, false);

// ////////////////////////////////////////////////
// TODO: Just for dev, then comment out
$(document).ready(onDeviceReady);
// ////////////////////////////////////////////////

var DB;

function onDeviceReady() {
    // alert("onDeviceReady");
    DB = prepareDb();
}

$(document).ready(function() {
    // UI init
    retrieveAllNotes(refreshNotesList);

    // Register UI events
    registerUiEvents();
});

/**
 * Reports a critical error message to the end user and exits the app. Use
 * polite and good messages here, it goes to the end user!
 * 
 * @param message
 *            the message to display
 * @param error
 *            optional detail
 */
// TODO: test this method on a device, whether the app really exits
function reportErrorAndExit(message, error) {
    var text = message;
    if (error != null) {
        text += ": " + JSON.stringify(error);
    }

    // TODO: For debugging use alert(), for prod replace with
    // navigator.notification!
    // navigator.notification.alert(text, failureConfirmed, "Oops...");
    alert("Oops: \n" + text);

    function failureConfirmed() {
        navigator.app.exit();
    }
}

/**
 * Reports an error message to the end user. Use polite and good messages here,
 * it goes to the end user!
 * 
 * @param message
 *            the message to display
 * @param error
 *            optional detail
 */
function reportError(message, error) {
    var text = message;
    if (error != null) {
        text += ": " + JSON.stringify(error);
    }

    // TODO: For debugging use alert(), for prod replace with
    // navigator.notification!
    // navigator.notification.alert(text, null, "Oops...");
    alert("Oops: \n" + text);
}

function registerUiEvents() {
    // --- pageNotes ---
    $("#pageNotes").on("pagebeforeshow", function() {
        retrieveAllNotes(refreshNotesList);
    });
    $("#btnNewNote").click(displayAddNewNote);
    $("#btnSearch").click(displaySearchNotes);

    // --- pageTags ---
    $("#pageTags").on("pagebeforeshow", function() {
        retrieveAllTags(refreshTagsList);
    });
    $("#btnAddTag").click(dialogAddTag);

    // --- pageFavorites ---
    $("#pageFavorites").on("pagebeforeshow", function() {
        retrieveFavNotes(refreshFavNotesList);
    });

    // --- pageNoteDetail ---
    $("#pageNoteDetail").on("pagebeforeshow", initPageNoteDetail);
    $("#btnDeleteNote").click(confirmDeleteNote);
    $("#btnNoteDetailFav").click(toggleFavorite);
    $("#noteDetailTags").click(dialogNoteTags);
    $("#btnAttachPhoto").click(attachPhoto);

    // --- dlgTagsForNote ---
    $("#dlgTagsForNote").on("pagebeforeshow", function() {
        retrieveAllTags(displayDlgTagsForNote);
    });

    // --- pageNotesForTag ---
    $("#pageNotesForTag").on("pagebeforeshow", function() {
        retrieveNotesForTag(refreshNotesForTagList);
    });
    $("#btnDeleteTag").click(confirmDeleteTag);
    $("#btnRenameTag").click(function() {
        $.mobile.changePage($("#dlgRenameTag"), {
            role : "dialog"
        });
    });

    // --- dlgRenameTag ---
    $("#dlgRenameTag").on("pagebeforeshow", function() {
        $("#renameTagName").val($("#pageNotesForTag").data("tagName"));
    });
    $("#cancelRenameTag").click(function() {
        $(this).closest(".ui-dialog").dialog("close");
    });

    $("#confirmRenameTag").click(function() {
        var newTagName = $.trim($("#renameTagName").val()).toLowerCase();
        if (newTagName.length == 0) {
            return;
        }

        $("#pageNotesForTag").data("tagName", newTagName);
        var tagId = $("#pageNotesForTag").data("tagId");
        renameTag(tagId, newTagName);
        $(this).closest(".ui-dialog").dialog("close");
    });
}

/**
 * Display current tags for a selected note. Also allows to set them.
 */
function dialogNoteTags() {
    $.mobile.changePage($("#dlgTagsForNote"), {
        role : "dialog"
    });

    $("#cancelTagsForNote").off().on("click", function() {
        $(this).closest(".ui-dialog").dialog("close");
    });

    $("#confirmTagsForNote").off().on("click", function() {
        var assignedTags = new Array();

        $("#dlgTagsForNote").find(".tag-select-list").each(function() {
            // this refers to input checkboxes with also tagId in jquery data
            var $tagCheckbox = $(this);
            var tagId = $tagCheckbox.data("tagId");
            var tagName = $tagCheckbox.data("tagName");
            var noteId = $("#pageNoteDetail").data("noteId");
            var checkedStr = $tagCheckbox.prop("checked");
            var associated = (checkedStr == true);

            if (associated) {
                var tag = {
                    id : tagId,
                    name : tagName
                };

                assignedTags.push(tag);
            }

            // Save to DB only for existing notes. For new notes it will be
            // saved when the note is persisted
            if ($("#pageNoteDetail").data("mode") != "new") {
                updateNoteTags(noteId, tagId, associated);
            }

            $(this).closest(".ui-dialog").dialog("close");
        });

        // Save the assigned tags to to the note detail page so that it it is
        // available even for new not yet persisted notes
        $("#pageNoteDetail").data("assignedTags", assignedTags);
    });
}

/**
 * Callback function called from a DB routine to render the tags dialog
 * 
 * @param tags
 */
function displayDlgTagsForNote(tags) {
    var assignedTagIds = new Array();
    var assignedTags = $("#pageNoteDetail").data("assignedTags");
    for ( var i = 0; i < assignedTags.length; i++) {
        assignedTagIds.push(assignedTags[i].id);
    }

    var $list = $("#listTagsForNote");
    $list.empty();

    for ( var i = 0; i < tags.length; i++) {
        var id = tags.item(i).id;
        var name = tags.item(i).name;

        var htmlElemId = "checkbox-tag-" + i;
        var htmlChecked = "";
        if ($.inArray(id, assignedTagIds) != -1) {
            htmlChecked = ' checked="checked"';
        }

        var inputHtml = '<input type="checkbox" class="tag-select-list" id="' + htmlElemId + '" ' + htmlChecked + ' />';
        var $input = $(inputHtml);
        $input.data("tagId", id);
        $input.data("tagName", name);
        $list.append($input);

        var labelHtml = '<label for="' + htmlElemId + '">' + name + '</label>';
        var $label = $(labelHtml);
        $list.append($label);
    }

    // $list.controlgroup("refresh");
    $("#dlgTagsForNote").trigger("create");
}

function displayAddNewNote() {
    var $page = $("#pageNoteDetail");
    $page.data("mode", "new");
    $page.data("assignedTags", new Array());
    $page.removeData("noteId").data("note", new Object());
    $page.find("#noteTitle").attr("readonly", false);
    $page.find("#noteBody").attr("readonly", false);
    $page.find("#noteTitle").val("");
    $page.find("#noteBody").val("");
    setButtonTheme($("#btnNoteDetailFav"), "a", "e");
    $.mobile.changePage($page);
}

function dialogAddTag() {
    $("#newTagName").val("");
    $.mobile.changePage($("#dlgAddTag"), {
        role : "dialog"
    });

    $("#cancelAddTag").off().on("click", function() {
        $(this).closest(".ui-dialog").dialog("close");
    });

    $("#confirmAddTag").off().on("click", function() {
        var tagName = $.trim($("#newTagName").val()).toLowerCase();
        if (tagName.length == 0) {
            return;
        }

        persistNewTag(tagName);
        $.mobile.changePage("#pageTags");
    });
}

/**
 * Inits #pageNoteDetail. Decides in which mode the page should be displayed:
 * new note, note view, note edit.
 */
function initPageNoteDetail() {
    var $page = $("#pageNoteDetail");
    var $headerButton = $("#btnHeaderNoteDetail");
    var mode = $page.data("mode");
    var noteId = $page.data("noteId");

    switch (mode) {
    case "view":
        showViewMode();
        break;
    case "edit":
        showEditMode();
        break;
    case "new":
        showNewMode();
        break;
    }

    function showViewMode() {
        $page.find("#noteTitle").attr("readonly", true);
        $page.find("#noteBody").attr("readonly", true);

        $headerButton.html("Edit");
        $headerButton.off().on("click", function() {
            $page.data("mode", "edit");
            // showEditMode();
            $.mobile.changePage("#pageNoteDetail", {
                allowSamePageTransition : true
            });
        });
        $headerButton.button("refresh");

        $("#btnDeleteNote").closest('.ui-btn').show();

        retrieveNote(noteId, updatePageNoteDetail);
        $page.find("#noteTitle").val(noteId);

        /**
         * Called as callback from DB routine to update the UI. The note object
         * is contained in the $page
         * 
         */
        function updatePageNoteDetail(note) {
            // Save the note in the page for later use from "external" contexts
            $page.data("note", note);

            $page.find("#noteTitle").val(note.title);
            $page.find("#noteBody").val(note.body);

            if (note.favorite) {
                // Yellow for favorite
                setButtonTheme($("#btnNoteDetailFav"), "e", "a");
            } else {
                // Default black for non-favorite
                setButtonTheme($("#btnNoteDetailFav"), "a", "e");
            }

            retrieveTagsForNote(noteId, function(noteId, assignedTags) {
                $("#pageNoteDetail").data("assignedTags", assignedTags);
                refreshTagsForNote();
            });
        }
    }

    function showEditMode() {
        $page.find("#noteTitle").attr("readonly", false);
        $page.find("#noteBody").attr("readonly", false);

        $headerButton.html("Save");
        $headerButton.off().on("click", saveNote);
        $headerButton.button("refresh");

        $("#btnDeleteNote").closest('.ui-btn').show();

        retrieveTagsForNote(noteId, function(noteId, assignedTags) {
            $("#pageNoteDetail").data("assignedTags", assignedTags);
            refreshTagsForNote();
        });
    }

    function showNewMode() {
        $headerButton.html("Save");
        $headerButton.off().on("click", saveNote);
        $headerButton.button("refresh");

        $("#btnDeleteNote").closest('.ui-btn').hide();

        refreshTagsForNote();
    }

    // saves a new/update an existing note in DB
    function saveNote() {
        var $page = $("#pageNoteDetail");
        var title = $page.find("#noteTitle").val();
        var body = $page.find("#noteBody").val();
        var favorite = $page.data("note").favorite;
        var assignedTags = $page.data("assignedTags");

        if (title.length == 0 && body.length == 0) {
            alert("Please enter some text");
            return;
        }
        // alert("saving " + title + " - " + body);

        if (mode === "new") {
            if (favorite == null) {
                favorite = 0;
            }
            persistNewNote(title, body, favorite, assignedTags);
            $.mobile.changePage("#pageNotes");
        } else {
            updateNote(noteId, title, body);
        }
    }

    /**
     * Refreshes #noteDetailTags based on
     * $("#pageNoteDetail").data("assignedTags")
     */
    function refreshTagsForNote() {
        var assignedTags = $("#pageNoteDetail").data("assignedTags");

        var strTags = "";
        for ( var i = 0; i < assignedTags.length; i++) {
            if (strTags.length > 0) {
                strTags += ", ";
            }
            strTags += assignedTags[i].name;
        }
        if (strTags.length > 0) {
            strTags = "[ " + strTags + " ]";
        }

        $("#noteDetailTags").val(strTags);
    }
}

/**
 * Toggles the Favorite flag for a note. Also toggles and updates the Favorite
 * button icon in #pageNoteDetail.
 * 
 */
function toggleFavorite() {
    var $page = $("#pageNoteDetail");
    var oldNote = $page.data("note");
    var newNote = jQuery.extend(true, {}, oldNote);

    if (oldNote.favorite) {
        newNote.favorite = 0;
        // Default black for non-favorite
        setButtonTheme($("#btnNoteDetailFav"), "a", "e");
    } else {
        newNote.favorite = 1;
        // Yellow for favorite
        setButtonTheme($("#btnNoteDetailFav"), "e", "a");
    }

    // For some reason the update of note.favorite does not work, I can't change
    // it. So copy and replace the entire note object
    $page.data("note", newNote);

    // Save to DB only for existing notes. For new notes it will be
    // saved when the note is persisted
    if ($("#pageNoteDetail").data("mode") != "new") {
        updateFavorite(newNote.id, newNote.favorite);
    }

}

/**
 * After Delete has been clicked in the note detail page
 */
function confirmDeleteNote() {
    var $noteDetailPage = $("#pageNoteDetail");
    var noteId = $noteDetailPage.data("noteId");
    var $dlgDeleteNote = $("#dlgDeleteNote");
    $.mobile.changePage($dlgDeleteNote, {
        role : "dialog"
    });

    $("#cancelDeleteNote").off().on("click", function() {
        $(this).closest(".ui-dialog").dialog("close");
    });

    $("#confirmDeleteNote").off().on("click", function() {
        deleteNote(noteId);
        $.mobile.changePage("#pageNotes");
    });
}

/**
 * After Delete has been clicked in the tag "detail" page (list of notes with
 * the tag). The current tagId is stored in $("#pageNotesForTag").data("tagId")
 */
function confirmDeleteTag() {
    $.mobile.changePage($("#dlgDeleteTag"), {
        role : "dialog"
    });

    $("#cancelDeleteTag").off().on("click", function() {
        $(this).closest(".ui-dialog").dialog("close");
    });

    $("#confirmDeleteTag").off().on("click", function() {
        var tagId = $("#pageNotesForTag").data("tagId");
        deleteTag(tagId);
        $.mobile.changePage("#pageTags");
    });
}

function displaySearchNotes() {
    // TODO: implement
    alert("implement");
}

/**
 * Called from DB routine to update #pageNotes
 * 
 * @param notes
 *            list of notes as retrieved from DB
 */
function refreshNotesList(notes) {
    refreshAnyNotesList($("#notesList"), notes);
}

/**
 * Called from DB routine to update #pageFavorites
 * 
 * @param notes
 *            the list of notes as retrieved from DB
 */
function refreshFavNotesList(notes) {
    refreshAnyNotesList($("#favsList"), notes);
}

/**
 * Called from DB routine to update #pageNotesForTag
 * 
 * @param notes
 *            the list of notes with the tag as retrieved from DB
 */
function refreshNotesForTagList(notes) {
    $("#lblTagName").html($("#pageNotesForTag").data("tagName"));
    refreshAnyNotesList($("#taggedNotesList"), notes);
}

function refreshAnyNotesList($list, notes) {
    // TODO: get the max length dynamically from the current screen dispositions
    var maxLength = 10;

    $list.empty();

    for ( var i = 0; i < notes.length; i++) {
        var id = notes.item(i).id;
        var title = notes.item(i).title;
        if (title == null || title.length == 0) {
            // No title, construct it from start of the note body
            var body = notes.item(i).body;
            if (body.length > 10) {
                title = body.substring(0, 10) + "...";
            } else {
                title = body;
            }
        }

        var liHtml = '<li><a href="#pageNoteDetail">' + title + '</a></li>\n';
        var $li = $(liHtml);
        $li.data("noteId", id);
        $list.append($li);

        $li.click(function() {
            var $this = $(this);
            $("#pageNoteDetail").data("mode", "view");
            $("#pageNoteDetail").data("noteId", $this.data("noteId"));
        });

    }

    $list.listview("refresh");
}

/**
 * Called from DB routine to update #pageTags
 * 
 * @param tags
 *            list of tags as retrieved from DB
 */
function refreshTagsList(tags) {
    var $list = $("#tagsList");
    $list.empty();

    for ( var i = 0; i < tags.length; i++) {
        var id = tags.item(i).id;
        var name = tags.item(i).name;

        var liHtml = '<li><a href="#pageNotesForTag">' + name + '</a></li>\n';
        var $li = $(liHtml);
        $li.data("tagId", id);
        $li.data("tagName", name);
        $list.append($li);

        $li.click(function() {
            var $this = $(this);
            $("#pageNotesForTag").data("tagId", $this.data("tagId"));
            $("#pageNotesForTag").data("tagName", $this.data("tagName"));
        });
    }

    $list.listview("refresh");
}

/*******************************************************************************
 * 
 * Multimedia stuff
 * 
 */

function getImageDirectory() {
    var path = "com.solucs.mm_notes";
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, fsOk, null);
    
    function fsOk(fs) {
        fs.root.getDirectory(path, {create: true, exclusive: false}, imgDirOk, imgDirError);
        
        function imgDirOk(parent) {
            console.log("Obtained/created the image directory; parent=" + JSON.stringify(parent));
        }
        
        function imgDirError(err) {
            console.log("Error obtaining/creating the image directory: " + JSON.stringify(err));
        }
    }
    
    var imgDir = new DirectoryEntry( { fullPath: path });
    return imgDir;
}


function attachPhoto() {
    var noteId = $("#pageNoteDetail").data("noteId");
    
    
    var pictureOptions = {
        quality : 49,
        destinationType : Camera.DestinationType.FILE_URI,
        sourceType : Camera.PictureSourceType.CAMERA, // CAMERA, PHOTOLIBRARY, SAVEDPHOTOALBUM
        targetWidth: 600,
        targetHeight: 800
    };

    navigator.camera.getPicture(pictureOk, pictureError, pictureOptions);

    function pictureOk(fileUri) {
        console.log("Photo for noteId=" + noteId + " taken, URI=" + fileUri);
        window.resolveLocalFileSystemURI(fileUri, resolutionOk, resolutionError);
        
        function resolutionError(err) {
            console.log("Error resolving image file URI: " + JSON.stringify(err));
        }
        
        function resolutionOk(fileEntry) {
            console.log("fileEntry.name=" + fileEntry.name + ", fileEntry.fullPath=" + fileEntry.fullPath);
            
            var destDir = getImageDirectory();
            var fileName = noteId + "_" + Date.now();
            alert(JSON.stringify(destDir));
            alert("... lost in Phonegap's callbacks...")
            fileEntry.moveTo(destDir, fileName, moveOk, moveError);
            
            function moveError(err) {
                console.log("Error moving image file: " + JSON.stringify(err));
            }
            
            function moveOk(fileEntry) {
                console.log("Image file successfully moved, fullPath=" + fileEntry.fullPath);
            }
        }
        
        
        
    }

    function pictureError(msg) {
        alert("pictureError: " + msg);
    }
}

/*******************************************************************************
 * 
 * DB stuff
 * 
 */

/**
 * Opens and initializes DB.
 * 
 * @return the phonegap Database object
 */
function prepareDb() {
    var db = openDb();
    db.transaction(createDb, dbInitError, dbInitOk);

    function dbInitError(err) {
        reportErrorAndExit("Error initializing database", err);
    }

    function dbInitOk() {
        // alert("DB initialized");
    }

    /**
     * Opens the app's DB or creates a new one if necessary.
     * 
     * @return Phonegap's Database obj.
     */
    function openDb() {
        var dbName = "com.solucs.mm_notes";
        var dbVersion = "1.0";
        var dbDisplayName = "MM Notes";
        var dbSize = 1000000; // 1 MB
        return window.openDatabase(dbName, dbVersion, dbDisplayName, dbSize);
    }

    /**
     * Creates the DB structure if doesn't exist and initializes it.
     * 
     */
    function createDb(tx) {
        // Notes
        // Multimedia attachments will probably need to be stored outside the DB
        // due to HTML 5 limitations on the DB size (3 MB or so?)
        tx.executeSql("CREATE TABLE IF NOT EXISTS notes (" + "id INTEGER PRIMARY KEY AUTOINCREMENT," + "title TEXT,"
                + "body TEXT," + "favorite INTEGER," + "modified INTEGER NOT NULL," + "tags_modified INTEGER)");

        // Tags
        tx.executeSql("CREATE TABLE IF NOT EXISTS tags (" + "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                + "name TEXT NOT NULL UNIQUE," + "modified INTEGER NOT NULL)");

        // Notes-tags M:N association
        tx.executeSql("CREATE TABLE IF NOT EXISTS notes_tags (" + "note_id INTEGER," + "tag_id INTEGER,"
                + "FOREIGN KEY(note_id) REFERENCES notes(id)," + "FOREIGN KEY(tag_id) REFERENCES tags(id),"
                + "CONSTRAINT unq_notes_tags UNIQUE (note_id, tag_id))");
    }

    return db;
}

/**
 * Creates a new Note in DB. Both title and body params are optional, however
 * one of them must be present. This method is used even when storing multimedia
 * attachments - they are added in a second step.
 * 
 * It also stores assigned tags for this new note.
 * 
 */
function persistNewNote(title, body, favorite, tags) {
    if (title.length == 0 && body.length == 0) {
        return false;
    }

    // DB.transaction(insertNote, insertNoteError, insertNoteOk);
    DB.transaction(insertNote, insertNoteError);

    function insertNote(tx) {
        tx.executeSql("INSERT INTO notes (title, body, favorite, modified) VALUES (?, ?, ?, ?)", [ title, body,
                favorite, Date.now() ], insertNoteOk, insertNoteError);
    }

    function insertNoteError(err) {
        console.log("Error inserting note in DB: " + JSON.stringify(err));
        reportError("Error adding note", err);
    }

    function insertNoteOk(tx, results) {
        console.log("Note saved [rowId=" + results.insertId + "; title=" + title + ", body=" + body + ", favorite="
                + favorite + "]");

        // Store tags for the note
        var noteId = results.insertId;
        for ( var i = 0; i < tags.length; i++) {
            updateNoteTags(noteId, tags[i].id, true);
        }
    }
}

/**
 * Update an existing note found by its ID in DB.
 * 
 * @param id
 * @param title
 * @param body
 */
function updateNote(id, title, body) {
    // TODO: copy paste. Fix, e.g. encapsulate into a method
    // normalizeNoteForDb(). Make note an object so that I can pass it from the
    // new function
    if (id == null || title.length == 0 && body.length == 0) {
        return false;
    }

    DB.transaction(updateNote, updateNoteError);

    function updateNote(tx) {
        tx.executeSql("UPDATE notes SET title = ?, body = ?, modified = ? WHERE id = ?",
                [ title, body, Date.now(), id ], updateNoteOk, updateNoteError);
    }

    function updateNoteError(err) {
        console.log("Error updating note in DB: " + JSON.stringify(err));
        reportError("Error updating note", err);
    }

    function updateNoteOk(tx, results) {
        console.log("Note updated [id=" + id + ", title=" + title + ", body=" + body + "]");
        // TODO: The page redirect is here because this callback is executed
        // after the parent meth (persistNewNote) finishes, so no possibility to
        // set some flags here, return some result value from here. Think how to
        // improve it. Use callbacks
        $.mobile.changePage("#pageNotes");
    }
}

/**
 * Retrieves all notes from DB and passes them to a specified callback function.
 * 
 * @param displayNotesListCallback
 */
function retrieveAllNotes(displayNotesListCallback) {
    DB.transaction(selectAllNotes, selectError);

    function selectAllNotes(tx) {
        tx.executeSql("SELECT id, title, body FROM notes ORDER BY id DESC", [], prepareResults, selectError);
    }

    function prepareResults(tx, results) {
        if (results.rows == null) {
            console.log("Fatal: results.rows == null for notes list. Exiting.");
            reportErrorAndExit("No notes results found in DB, exiting, sorry for inconveniences");
        }

        displayNotesListCallback(results.rows);
    }

    function selectError(err) {
        console.log("Error selecting notes from DB: " + JSON.stringify(err));
        reportError("Error getting notes", err);
    }
}

/**
 * Retrieves all tags from DB and passes them to a specified callback function.
 * 
 * @param displayTagListCallback
 */
function retrieveAllTags(displayTagListCallback) {
    DB.transaction(selectAllTags, selectError);

    function selectAllTags(tx) {
        tx.executeSql("SELECT id, name FROM tags ORDER BY name ASC", [], prepareResults, selectError);
    }

    function prepareResults(tx, results) {
        if (results.rows == null) {
            console.log("Fatal: results.rows == null for tags list. Exiting.");
            reportErrorAndExit("No tag results found in DB, exiting, sorry for inconveniences");
        }

        displayTagListCallback(results.rows);
    }

    function selectError(err) {
        console.log("Error selecting tags from DB: " + JSON.stringify(err));
        reportError("Error getting tags", err);
    }
}

/**
 * Retrieves all favorited notes from DB and passes them to a specified callback
 * function.
 * 
 * @param displayFavNotesListCallback
 */
function retrieveFavNotes(displayFavNotesListCallback) {
    DB.transaction(selectFavNotes, selectError);

    function selectFavNotes(tx) {
        tx.executeSql("SELECT id, title, body FROM notes WHERE favorite = 1 ORDER BY id DESC", [], prepereResults,
                selectError);
    }

    function prepereResults(tx, results) {
        if (results.rows == null) {
            console.log("Fatal: results.rows == null for fav notes list. Exiting.");
            reportErrorAndExit("No fav notes results found in DB, exiting, sorry for inconveniences");
        }

        displayFavNotesListCallback(results.rows);
    }

    function selectError(err) {
        console.log("Error selecting fav notes from DB: " + JSON.stringify(err));
        reportError("Error getting fav notes", err);
    }
}

/**
 * Retrieves from the DB notes that have assigned the tagId stored in
 * $("#pageNotesForTag").data("tagId"). Then calls the callback to refresh the
 * UI.
 * 
 * @param uiCallback
 */
function retrieveNotesForTag(uiCallback) {
    var tagId = $("#pageNotesForTag").data("tagId");

    DB.transaction(selectNotes, selectError);

    function selectNotes(tx) {
        tx
                .executeSql(
                        "SELECT n.id, n.title, n.body FROM notes n, notes_tags nt WHERE nt.tag_id = ? AND n.id = nt.note_id ORDER BY id DESC",
                        [ tagId ], prepereResults, selectError);
    }

    function prepereResults(tx, results) {
        uiCallback(results.rows);
    }

    function selectError(err) {
        console.log("Error selecting notes with tagId=" + tagId + " from DB: " + JSON.stringify(err));
        reportError("Error getting notes with the tag", err);
    }
}

/**
 * Retrieves a note from DB and then calls a callback function to update the
 * note detail UI page
 * 
 * @param noteId
 * @param updateNoteDetailPageCallback
 *            the callback method to be called; the selected note object will be
 *            passed as a param
 */
function retrieveNote(noteId, updateNoteDetailPageCallback) {
    DB.transaction(selectNote, selectError);

    function selectNote(tx) {
        tx.executeSql("SELECT id, title, body, favorite FROM notes WHERE id = ?", [ noteId ], selectOk, selectError);
    }

    function selectOk(tx, results) {
        // There should be exactly 1 row
        if (results.rows == null || results.rows.length != 1) {
            console.log("Error retrieving note detail from DB; noteId=" + noteId + ". results.rows.length="
                    + results.rows.length);
            return;
        }

        var note = results.rows.item(0);
        updateNoteDetailPageCallback(note);
    }

    function selectError(err) {
        console.log("Error selecting note noteId=" + noteId + " from DB: " + JSON.stringify(err));
        reportError("Error getting note", err);
    }
}

/**
 * Deletes a given note from DB.
 * 
 * @param noteId
 */
function deleteNote(noteId) {
    DB.transaction(deleteNote, deleteError);

    function deleteNote(tx) {
        tx.executeSql("DELETE FROM notes WHERE id = ?", [ noteId ], deleteOk, deleteError);
    }

    function deleteOk(tx, results) {
        console.log("Note deleted from DB; noteId=" + noteId);
    }

    function deleteError(err) {
        console.log("Error deleting note noteId=" + noteId + " from DB: " + JSON.stringify(err));
        reportError("Error deleting note", err);
    }
}

/**
 * Updates the note's favorite flag.
 * 
 * @param noteId
 * @param isFavorite
 *            boolean
 */
function updateFavorite(noteId, isFavorite) {
    DB.transaction(updateFav, updateError);

    function updateFav(tx) {
        tx.executeSql("UPDATE notes SET favorite = ?, modified = ? WHERE id = ?", [ isFavorite, Date.now(), noteId ],
                updateOk, updateError);
    }

    function updateOk(tx, results) {
        console.log("Favorite flag for noteId=" + noteId + " updated to " + isFavorite);
    }

    function updateError(err) {
        console.log("Error updating note's favorite flag; noteId=" + noteId + " from DB: " + JSON.stringify(err));
        reportError("Error updating note's favorite flag", err);
    }
}

function persistNewTag(tagName) {
    if (tagName == null || tagName.length == 0) {
        return;
    }

    DB.transaction(insertTag, insertTagError);

    function insertTag(tx) {
        tx.executeSql("INSERT INTO tags (name, modified) VALUES (?, ?)", [ tagName, Date.now() ], insertTagOk,
                insertTagError);
    }

    function insertTagError(err) {
        console.log("Error inserting tag in DB: " + JSON.stringify(err));
    }

    function insertTagOk(tx, results) {
        console.log("Tag saved [rowId=" + results.insertId + "; name=" + tagName + "]");
    }
}

/**
 * Updates one note-tag association in DB. It either creates it or removes it.
 * Also updates the tags_modified DB flag in the notes DB table -- used for
 * server synchro.
 * 
 * @param noteId
 * @param tagId
 * @param associated
 */
function updateNoteTags(noteId, tagId, associated) {

    if (associated) {
        DB.transaction(insertRel, dbRelError);
    } else {
        DB.transaction(deleteRel, dbRelError);
    }

    function insertRel(tx) {
        // The table has a UNIQUE constraint, so no worries
        tx.executeSql("INSERT INTO notes_tags (note_id, tag_id) VALUES(?, ?)", [ noteId, tagId ], dbRelOk, dbRelError);
        updateTimestamp(tx);
    }

    function deleteRel(tx) {
        tx
                .executeSql("DELETE FROM notes_tags WHERE note_id = ? AND tag_id = ?", [ noteId, tagId ], dbRelOk,
                        dbRelError);
        updateTimestamp(tx);
    }

    function updateTimestamp(tx) {
        console.log("Updating tags_modified for noteId=" + noteId);
        tx.executeSql("UPDATE notes SET tags_modified = ? WHERE id = ?", [ Date.now(), noteId ]);
    }

    function dbRelOk() {
        console.log("Association updated: noteId=" + noteId + " - tagId=" + tagId + " - " + associated);
    }

    function dbRelError(err) {
        console.log("Error updating association (probably already exists): noteId=" + noteId + " - tagId=" + tagId
                + " - " + associated + ": " + JSON.stringify(err));
    }
}

/**
 * Deletes a given tag from DB and also updates all associated notes'
 * tags_modified attribute (for synchro)
 * 
 * @param tagId
 */
function deleteTag(tagId) {
    DB.transaction(deleteTagCompletely, deleteError);

    function deleteTagCompletely(tx) {
        tx.executeSql(
                "UPDATE notes SET tags_modified = ? WHERE id IN (SELECT note_id FROM notes_tags WHERE tag_id = ?)", [
                        Date.now(), tagId ]);
        tx.executeSql("DELETE FROM notes_tags WHERE tag_id = ?", [ tagId ]);
        tx.executeSql("DELETE FROM tags WHERE id = ?", [ tagId ], deleteOk, deleteError);
    }

    function deleteOk(tx, results) {
        console.log("tagId=" + tagId + " removed and tags_modified of its previous notes updated");
    }

    function deleteError(err) {
        console.log("Error deleting tagId=" + tagId + ": " + JSON.stringify(err));
    }
}

/**
 * Retrievs tags assigned to the specified note. Then calls the callback
 * function.
 * 
 * @param noteId
 * @param backToUiCallback
 *            called with params (noteId, tags) where tags is an array of {id,
 *            name}
 */
function retrieveTagsForNote(noteId, backToUiCallback) {
    DB.transaction(selectTags, selectError);

    function selectTags(tx) {
        tx
                .executeSql(
                        "SELECT t.id AS tagId, t.name AS tagName FROM tags t, notes_tags nt WHERE t.id = nt.tag_id AND nt.note_id = ?",
                        [ noteId ], selectOk, selectError);
    }

    function selectOk(tx, results) {
        var tags = new Array();

        for ( var i = 0; i < results.rows.length; i++) {
            var tag = {
                id : results.rows.item(i).tagId,
                name : results.rows.item(i).tagName
            };
            tags.push(tag);
        }

        backToUiCallback(noteId, tags);
    }

    function selectError(err) {
        console.log("Error selecting tags from DB for noteId=" + noteId + ": " + JSON.stringify(err));
    }
}

/**
 * Renames in DB the tag specified by tagId to the new name.
 * 
 * @param tagId
 * @param tagName
 */
function renameTag(tagId, newTagName) {
    DB.transaction(renameTag, renameError);

    function renameTag(tx) {
        tx.executeSql("UPDATE tags SET name = ? WHERE id = ?", [ newTagName, tagId ], renameOk, renameError);
    }

    function renameOk(tx, results) {
        console.log("tagId=" + tagId + " renamed to " + newTagName);
    }

    function renameError(err) {
        console.log("Error renaming tagId=" + tagId + " to " + newTagName + ": " + JSON.stringify(err));
    }
}

// /////// end DB stuff

// ///////////// Hacks below...

/**
 * jQuery mobile work around
 * 
 * @param newTheme
 *            e.g. "e"
 * @param oldTheme
 *            e.g. "a"
 */
function setButtonTheme($button, newTheme, oldTheme) {
    $button.attr("data-theme", newTheme);
    $button.closest("div").attr("data-theme", newTheme).removeClass("ui-btn-hover-" + oldTheme).removeClass(
            "ui-btn-up-" + oldTheme).addClass("ui-btn-hover-" + newTheme).addClass("ui-btn-up-" + newTheme);
    $button.button();
    $button.button("refresh");
}
