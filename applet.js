const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Pango = imports.gi.Pango;
const St = imports.gi.St;

const Applet = imports.ui.applet;
const Main = imports.ui.main;
const ModalDialog = imports.ui.modalDialog;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;
const Tooltips = imports.ui.tooltips;

const Util = imports.misc.util;
const Lang = imports.lang;

const MENU_ITEM_TEXT_LENGTH = 25;
const MENU_PADDING_WIDTH = 25;
let menu_item_icon_size;


function AboutDialog(metadata) {
    this._init(metadata);
}

AboutDialog.prototype = {
    __proto__: ModalDialog.ModalDialog.prototype,
    
    _init: function(metadata) {
        try {
            ModalDialog.ModalDialog.prototype._init.call(this, {  });
            
            let contentBox = new St.BoxLayout({ vertical: true, style_class: "about-content" });
            this.contentLayout.add_actor(contentBox);
            
            let topBox = new St.BoxLayout();
            contentBox.add_actor(topBox);
            
            //icon
            let icon;
            if ( metadata.icon ) icon = new St.Icon({ icon_name: metadata.icon, icon_size: 48, icon_type: St.IconType.FULLCOLOR, style_class: "about-icon" });
            else {
                let file = Gio.file_new_for_path(metadata.path + "/icon.png");
                if ( file.query_exists(null) ) {
                    let gicon = new Gio.FileIcon({ file: file });
                    icon = new St.Icon({ gicon: gicon, icon_size: 48, icon_type: St.IconType.FULLCOLOR, style_class: "about-icon" });
                }
                else {
                    icon = new St.Icon({ icon_name: "applets", icon_size: 48, icon_type: St.IconType.FULLCOLOR, style_class: "about-icon" });
                }
            }
            topBox.add_actor(icon);
            
            let topTextBox = new St.BoxLayout({ vertical: true });
            topBox.add_actor(topTextBox);
            
            /*title*/
            let titleBox = new St.BoxLayout();
            topTextBox.add_actor(titleBox);
            
            let title = new St.Label({ text: metadata.name, style_class: "about-title" });
            titleBox.add_actor(title);
            
            if ( metadata.version ) {
                let versionBin = new St.Bin({ x_align: St.Align.START, y_align: St.Align.END});
                titleBox.add_actor(versionBin);
                let version = new St.Label({ text: "v " + metadata.version, style_class: "about-version" });
                versionBin.add_actor(version);
            }
            
            //uuid
            let uuid = new St.Label({ text: metadata.uuid, style_class: "about-uuid" });
            topTextBox.add_actor(uuid);
            
            //description
            let desc = new St.Label({ text: metadata.description, style_class: "about-description" });
            let dText = desc.clutter_text;
            topTextBox.add_actor(desc);
            
            /*description and comments*/
            let scrollBox = new St.ScrollView({ style_class: "about-scrollBox" });
            contentBox.add_actor(scrollBox);
            let infoBox = new St.BoxLayout({ vertical: true, style_class: "about-scrollBox-innerBox" });
            scrollBox.add_actor(infoBox);
            
            //comments
            if ( metadata.comments ) {
                let comments = new St.Label({ text: "Comments:\n\t" + metadata.comments });
                let cText = comments.clutter_text;
                cText.ellipsize = Pango.EllipsizeMode.NONE;
                cText.line_wrap = true;
                cText.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
                infoBox.add_actor(comments);
            }
            
            //website
            if ( metadata.website ) {
                let wsBox = new St.BoxLayout({ vertical: true });
                infoBox.add_actor(wsBox);
                
                let wLabel = new St.Label({ text: "Website:" });
                wsBox.add_actor(wLabel);
                
                let wsButton = new St.Button({ x_align: St.Align.START, style_class: "cinnamon-link", name: "about-website" });
                wsBox.add_actor(wsButton);
                let website = new St.Label({ text: metadata.website });
                let wtext = website.clutter_text;
                wtext.ellipsize = Pango.EllipsizeMode.NONE;
                wtext.line_wrap = true;
                wtext.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
                wsButton.add_actor(website);
                wsButton.connect("clicked", Lang.bind(this, this.launchSite, metadata.website));
            }
            
            //contributors
            if ( metadata.contributors ) {
                let list = metadata.contributors.split(",").join("\n\t");
                let contributors = new St.Label({ text: "Contributors:\n\t" + list });
                infoBox.add_actor(contributors);
            }
            
            //dialog close button
            this.setButtons([
                { label: "Close", key: "", focus: true, action: Lang.bind(this, this._onOk) }
            ]);
            
            this.open(global.get_current_time());
        } catch(e) {
            global.log(e);
        }
    },
    
    _onOk: function() {
        this.close(global.get_current_time());
    },
    
    launchSite: function(a, b, site) {
        Util.spawnCommandLine("xdg-open " + site);
        this.close(global.get_current_time());
    }
}


function MenuItem(title, icon){
    this._init(title, icon);
}

MenuItem.prototype = {
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,
    
    _init: function(title, icon, params){
        try{
            
            PopupMenu.PopupBaseMenuItem.prototype._init.call(this, params);
            this.addActor(icon);
            
            if ( title.length > MENU_ITEM_TEXT_LENGTH ) {
                let tooltip = new Tooltips.Tooltip(this.actor, title);
                title = title.slice(0,MENU_ITEM_TEXT_LENGTH-3) + "...";
            }
            let label = new St.Label({ text:title });
            this.addActor(label);
            this.actor._delegate = this;
            
        } catch (e){
            global.logError(e);
        }
    }
}


function BookmarkMenuItem(menu, place) {
    this._init(menu, place);
}

BookmarkMenuItem.prototype = {
    __proto__: MenuItem.prototype,
    
    _init: function(menu, place) {
        try {
            this.menu = menu;
            this.place = place;
            
            let icon = place.iconFactory(menu_item_icon_size);
            MenuItem.prototype._init.call(this, place.name, icon);
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    activate: function(event) {
        try {
            
            this.menu.close();
            this.place.launch();
            
        } catch(e) {
            global.logError(e);
        }
    }
}


function VolumeMenuItem(menu, volume, mounted) {
    this._init(menu, volume, mounted);
}

VolumeMenuItem.prototype = {
    __proto__: MenuItem.prototype,
    
    _init: function(menu, volume, mounted) {
        try {
            
            let icon = volume.get_icon();
            MenuItem.prototype._init.call(this, volume.get_name(), St.TextureCache.get_default().load_gicon(null, icon, menu_item_icon_size));
            
            if ( mounted ) {
                let ejectIcon = new St.Icon({ icon_name: "media-eject", icon_size: menu_item_icon_size, icon_type: St.IconType.FULLCOLOR });
                let ejectButton = new St.Button({ child: ejectIcon });
                this.addActor(ejectButton, { span: -1, align: St.Align.END });
                
                ejectButton.connect("clicked", function() {
                    let mount = volume.get_mount();
                    mount.unmount_with_operation(0, null, null, function(mount, res) {
                        volume.unmount_with_operation_finish(res);
                    });
                });
                
                this.connect("activate", function() {
                    menu.close();
                    Gio.app_info_launch_default_for_uri(volume.get_mount().get_root().get_uri(), global.create_app_launch_context());
                });
            }
            else {
                this.connect("activate", function() {
                    menu.close();
                    volume.mount(0, null, null, function(volume, res) {
                        volume.mount_finish(res);
                        Gio.app_info_launch_default_for_uri(volume.get_mount().get_root().get_uri(), global.create_app_launch_context());
                    });
                });
            }
            
        } catch(e) {
            global.logError(e);
        }
    }
}


function PlaceMenuItem(menu, title, uri, iName) {
    this._init(menu, title, uri, iName);
}

PlaceMenuItem.prototype = {
    __proto__: MenuItem.prototype,
    
    _init: function(menu, title, uri, iName) {
        try {
            
            this.menu = menu;
            this.uri = uri;
            
            let icon = new St.Icon({icon_name: iName, icon_size: menu_item_icon_size, icon_type: St.IconType.FULLCOLOR});
            MenuItem.prototype._init.call(this, title, icon);
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    activate: function(event) {
        try {
            
            this.menu.close();
            Gio.app_info_launch_default_for_uri(this.uri, global.create_app_launch_context());
            
        } catch(e) {
            global.logError(e);
        }
    }
}


function CustomMenuItem(menu, uri) {
    this._init(menu, uri);
}

CustomMenuItem.prototype = {
    __proto__: MenuItem.prototype,
    
    _init: function(menu, uri) {
        try {
            
            this.menu = menu;
            this.uri = uri;
            
            let fileInfo = Gio.File.new_for_uri(uri).query_info("*", 0, null);
            let icon = fileInfo.get_icon();
            
            MenuItem.prototype._init.call(this, fileInfo.get_name(), St.TextureCache.get_default().load_gicon(null, icon, menu_item_icon_size));
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    activate: function(event) {
        try {
            
            this.menu.close();
            Gio.app_info_launch_default_for_uri(this.uri, global.create_app_launch_context());
            
        } catch(e) {
            global.logError(e);
        }
    }
}


function RecentMenuItem(menu, title, iName, file) {
    this._init(menu, title, iName, file);
}

RecentMenuItem.prototype = {
    __proto__: MenuItem.prototype,
    
    _init: function(menu, title, iName, file) {
        try {
            
            this.menu = menu;
            this.file = file;
            
            let icon = new St.Icon({icon_name: iName, icon_size: menu_item_icon_size, icon_type: St.IconType.FULLCOLOR});
            MenuItem.prototype._init.call(this, title, icon);
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    activate: function(event) {
        try {
            
            this.menu.close();
            Gio.app_info_launch_default_for_uri(this.file, global.create_app_launch_context());
            
        } catch(e) {
            global.logError(e);
        }
    }
}


function ClearRecentMenuItem(menu, recentManager) {
    this._init(menu, recentManager);
}

ClearRecentMenuItem.prototype = {
    __proto__: MenuItem.prototype,
    
    _init: function(menu, recentManager) {
        try {
            
            this.menu = menu;
            this.recentManager = recentManager;
            
            let icon = new St.Icon({icon_name: "edit-clear", icon_size: menu_item_icon_size, icon_type: St.IconType.FULLCOLOR});
            MenuItem.prototype._init.call(this, _("Clear"), icon);
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    activate: function(event) {
        try {
            
            this.menu.close();
            this.recentManager.purge_items();
            
        } catch(e) {
            global.logError(e);
        }
    }
}


function MyApplet(metadata, orientation, panel_height, instanceId) {
    this._init(metadata, orientation, panel_height, instanceId);
}

MyApplet.prototype = {
    __proto__: Applet.TextIconApplet.prototype,
    
    _init: function(metadata, orientation, panel_height, instanceId) {
        try {
            
            this.metadata = metadata;
            this.instanceId = instanceId;
            this.orientation = orientation;
            Applet.TextIconApplet.prototype._init.call(this, this.orientation, panel_height);
            
            //initiate settings
            this.bindSettings();
            
            //set up panel
            this.setPanelIcon();
            this.setPanelText();
            this.set_applet_tooltip(_("Places"));
            
            this._applet_context_menu.addMenuItem(new Applet.MenuItem(_("About..."), "dialog-question", Lang.bind(this, this.openAbout)));
            
            //listen for changes
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.recentManager = new Gtk.RecentManager();
            this.recentManager.connect("changed", Lang.bind(this, this.buildRecentDocumentsSection));
            Main.placesManager.connect("bookmarks-updated", Lang.bind(this, this.buildUserSection));
            this.volumeMonitor = Gio.VolumeMonitor.get();
            this.volumeMonitor.connect("volume-added", Lang.bind(this, this.updateVolumes));
            this.volumeMonitor.connect("volume-removed", Lang.bind(this, this.updateVolumes));
            this.volumeMonitor.connect("mount-added", Lang.bind(this, this.updateVolumes));
            this.volumeMonitor.connect("mount-removed", Lang.bind(this, this.updateVolumes));
            
            this.buildMenu();
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    on_applet_clicked: function(event) {
        this.menu.toggle();
    },
    
    on_applet_removed_from_panel: function() {
        if ( this.keyId ) Main.keybindingManager.removeHotKey(this.keyId);
    },
    
    openAbout: function() {
        new AboutDialog(this.metadata);
    },
    
    openMenu: function() {
        this.menu.toggle();
    },
    
    bindSettings: function() {
        this.settings = new Settings.AppletSettings(this, this.metadata.uuid, this.instanceId);
        this.settings.bindProperty(Settings.BindingDirection.IN, "panelIcon", "panelIcon", this.setPanelIcon);
        this.settings.bindProperty(Settings.BindingDirection.IN, "panelText", "panelText", this.setPanelText);
        this.settings.bindProperty(Settings.BindingDirection.IN, "iconSize", "iconSize", this.buildMenu)
        this.settings.bindProperty(Settings.BindingDirection.IN, "showDesktop", "showDesktop", this.buildUserSection);
        this.settings.bindProperty(Settings.BindingDirection.IN, "userCustomPlaces", "userCustomPlaces", this.buildUserSection);
        this.settings.bindProperty(Settings.BindingDirection.IN, "showTrash", "showTrash", this.buildTrashItem);
        this.settings.bindProperty(Settings.BindingDirection.IN, "showComputer", "showComputer", this.buildSystemSection);
        this.settings.bindProperty(Settings.BindingDirection.IN, "showRoot", "showRoot", this.buildSystemSection);
        this.settings.bindProperty(Settings.BindingDirection.IN, "showVolumes", "showVolumes", this.buildSystemSection);
        this.settings.bindProperty(Settings.BindingDirection.IN, "showNetwork", "showNetwork", this.buildSystemSection);
        this.settings.bindProperty(Settings.BindingDirection.IN, "systemCustomPlaces", "systemCustomPlaces", this.buildSystemSection);
        this.settings.bindProperty(Settings.BindingDirection.IN, "showRecentDocuments", "showRecentDocuments", this.buildMenu);
        this.settings.bindProperty(Settings.BindingDirection.IN, "recentSizeLimit", "recentSizeLimit", this.buildRecentDocumentsSection);
        this.settings.bindProperty(Settings.BindingDirection.IN, "keyOpen", "keyOpen", this.setKeybinding);
        this.setKeybinding();
    },
    
    setKeybinding: function() {
        if ( this.keyId ) Main.keybindingManager.removeHotKey(this.keyId);
        if ( this.keyOpen == "" ) return;
        this.keyId = "placesCenter-open";
        Main.keybindingManager.addHotKey(this.keyId, this.keyOpen, Lang.bind(this, this.openMenu));
    },
    
    buildMenu: function() {
        try {
            
            if ( this.menu ) this.menu.destroy();
            
            menu_item_icon_size = this.iconSize;
            
            this.menu = new Applet.AppletPopupMenu(this, this.orientation);
            this.menuManager.addMenu(this.menu);
            let section = new PopupMenu.PopupMenuSection();
            this.menu.addMenuItem(section);
            let mainBox = new St.BoxLayout({ style_class: "xCenter-mainBox", vertical: false });
            section.actor.add_actor(mainBox);
            
            //User section
            let userPaneBox = new St.BoxLayout({ style_class: "xCenter-pane" });
            let userPane = new PopupMenu.PopupMenuSection();
            userPaneBox.add_actor(userPane.actor);
            let userTitle = new PopupMenu.PopupBaseMenuItem({ style_class: "xCenter-title", reactive: false });
            userPane.addMenuItem(userTitle);
            userTitle.addActor(new St.Label({ text: GLib.get_user_name().toUpperCase() }));
            
            //add link to search tool
            let userSearchButton = new St.Button();
            userTitle.addActor(userSearchButton);
            let userSearchImage = new St.Icon({ icon_name: "edit-find", icon_size: 10, icon_type: St.IconType.SYMBOLIC });
            userSearchButton.add_actor(userSearchImage);
            userSearchButton.connect("clicked", Lang.bind(this, this.search, GLib.get_home_dir()));
            new Tooltips.Tooltip(userSearchButton, _("Search Home Folder"));
            
            this.userSection = new PopupMenu.PopupMenuSection();
            userPane.addMenuItem(this.userSection);
            
            mainBox.add_actor(userPaneBox, { span: 1 });
            this.buildUserSection();
            
            //system section
            let systemPaneBox = new St.BoxLayout({ style_class: "xCenter-pane" });
            let systemPane = new PopupMenu.PopupMenuSection();
            systemPaneBox.add_actor(systemPane.actor);
            let systemTitle = new PopupMenu.PopupBaseMenuItem({ style_class: "xCenter-title", reactive: false });
            systemPane.addMenuItem(systemTitle);
            systemTitle.addActor(new St.Label({ text: _("SYSTEM") }));
            
            //add link to search tool
            let systemSearchButton = new St.Button();
            systemTitle.addActor(systemSearchButton);
            let systemSearchImage = new St.Icon({ icon_name: "edit-find", icon_size: 10, icon_type: St.IconType.SYMBOLIC });
            systemSearchButton.add_actor(systemSearchImage);
            systemSearchButton.connect("clicked", Lang.bind(this, this.search));
            new Tooltips.Tooltip(systemSearchImage, _("Search File System"));
            
            this.systemSection = new PopupMenu.PopupMenuSection();
            systemPane.addMenuItem(this.systemSection);
            
            mainBox.add_actor(systemPaneBox, { span: 1 });
            this.buildSystemSection();
            
            //recent documents section
            if ( this.showRecentDocuments ) {
                let recentPane = new PopupMenu.PopupMenuSection();
                mainBox.add_actor(recentPane.actor, { span: 1 });
                
                let title = new PopupMenu.PopupMenuItem(_("RECENT DOCUMENTS"), { reactive: false });
                recentPane.addMenuItem(title);
                
                let recentScrollBox = new St.ScrollView({ x_fill: true, y_fill: false, y_align: St.Align.START });
                recentPane.actor.add_actor(recentScrollBox);
                recentScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
                let vscroll = recentScrollBox.get_vscroll_bar();
                vscroll.connect("scroll-start", Lang.bind(this, function() { this.menu.passEvents = true; }));
                vscroll.connect("scroll-stop", Lang.bind(this, function() { this.menu.passEvents = false; }));
                
                this.recentSection = new PopupMenu.PopupMenuSection();
                recentScrollBox.add_actor(this.recentSection.actor);
                
                let clearRecent = new ClearRecentMenuItem(this.menu, this.recentManager);
                recentPane.addMenuItem(clearRecent);
                
                this.buildRecentDocumentsSection();
            }
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    buildUserSection: function() {
        this.userSection.removeAll();
        
        let defaultPlaces = Main.placesManager.getDefaultPlaces();
        let bookmarks = [defaultPlaces[0]]
        if ( this.showDesktop ) bookmarks.push(defaultPlaces[1]);
        let bookmarks = bookmarks.concat(Main.placesManager.getBookmarks());
        
        for ( let i = 0; i < bookmarks.length; i++) {
            let bookmark = new BookmarkMenuItem(this.menu, bookmarks[i]);
            this.userSection.addMenuItem(bookmark);
        }
        
        //custom places
        this.buildCustomPlaces(this.userCustomPlaces, this.userSection);
        
        //trash
        this.buildTrashItem();
    },
    
    buildSystemSection: function() {
        this.systemSection.removeAll();
        
        //computer
        if ( this.showComputer ) {
            let computer = new PlaceMenuItem(this.menu, _("Computer"), "computer:///", "computer");
            this.systemSection.addMenuItem(computer);
        }
        
        //file system
        if ( this.showRoot) {
            let fileSystem = new PlaceMenuItem(this.menu, _("File System"), "file:///", "drive-harddisk");
            this.systemSection.addMenuItem(fileSystem);
        }
        
        //volumes and mounts
        if ( this.showVolumes ) {
            this.devicesSection = new PopupMenu.PopupMenuSection();
            this.systemSection.addMenuItem(this.devicesSection);
            this.buildDevicesSection();
        }
        
        //custom places
        this.buildCustomPlaces(this.systemCustomPlaces, this.systemSection);
        
        //network items
        if ( this.showNetwork ) {
            let network = new PlaceMenuItem(this.menu, _("Network"), "network:///", "network-workgroup");
            this.systemSection.addMenuItem(network);
            
            let connectToItem = new BookmarkMenuItem(this.menu, Main.placesManager.getDefaultPlaces()[2]);
            this.systemSection.addMenuItem(connectToItem);
        }
    },
    
    buildCustomPlaces: function(list, container) {
        if ( list == "" ) return;
        let uris = [];
        let customPlaces = list.split(",");
        
        for ( let i = 0; i < customPlaces.length; i++ ) {
            if ( customPlaces[i] == "" ) continue;
            try {
                
                let place = customPlaces[i].replace("~/", GLib.get_home_dir() + "/");
                while ( place[0] == " " ) place = place.substr(1);
                if ( place.search("://") == -1 ) place = "file://" + place;
                let file = Gio.File.new_for_uri(place);
                if ( file.query_exists(null) ) uris.push(place);
                
            } catch(e) { continue; }
        }
        
        if ( uris.length < 1 ) return;
        
        for ( let i = 0; i < uris.length; i++ ) {
            let customPlace = new CustomMenuItem(this.menu, uris[i]);
            container.addMenuItem(customPlace);
        }
    },
    
    buildDevicesSection: function() {
        this.devicesSection.removeAll();
        
        let volumes = this.volumeMonitor.get_volumes();
        let mounts = this.volumeMonitor.get_mounts();
        
        for ( let i = 0; i < volumes.length; i++ ) {
            let volume = volumes[i];
            let mounted = false;
            for ( let j = 0; j < mounts.length; j++ ) {
                if ( volume.get_name() == mounts[j].get_name() ) mounted = true;
            }
            
            let volumeMenuItem = new VolumeMenuItem(this.menu, volume, mounted);
            this.devicesSection.addMenuItem(volumeMenuItem);
        }
    },
    
    buildRecentDocumentsSection: function() {
        if ( !this.showRecentDocuments ) return;
        this.recentSection.removeAll();
        
        let recentDocuments = this.recentManager.get_items();
        
        let showCount;
        if ( this.recentSizeLimit == 0 ) showCount = recentDocuments.length;
        else showCount = ( this.recentSizeLimit < recentDocuments.length ) ? this.recentSizeLimit : recentDocuments.length;
        for ( let i = 0; i < showCount; i++ ) {
            let recentInfo = recentDocuments[i];
            let mimeType = recentInfo.get_mime_type().replace("\/","-");
            let recentItem = new RecentMenuItem(this.menu, recentInfo.get_display_name(), mimeType, recentInfo.get_uri());
            this.recentSection.addMenuItem(recentItem);
        }
    },
    
    updateVolumes: function() {
        if ( this.updatingDevices ) return;
        this.updatingDevices = true;
        this.buildDevicesSection();
        this.updatingDevices = false;
        this.buildUserSection();
    },
    
    buildTrashItem: function() {
        if ( this.trashItem ) this.trashItem.destroy();
        if ( this.trashMonitorConnectId != null ) {
            this.trashMonitor.disconnect(this.trashMonitorConnectId);
            this.trashMonitorConnectId = null;
        }
        if ( this.showTrash == 0 ) return;
        
        let uri = "trash:///";
        let trash = Gio.File.new_for_uri(uri);
        let enumerator = trash.enumerate_children("*", 0, null);
        let trashcanEmpty = enumerator.next_file(null) == null;
        this.trashMonitor = trash.monitor_directory(0, null);
        this.trashMonitorConnectId = this.trashMonitor.connect("changed", Lang.bind(this, this.buildTrashItem));
        
        if ( this.showTrash == 2 && trashcanEmpty ) return;
        
        let iName = ( trashcanEmpty ) ? "trashcan_empty" : "trashcan_full";
        
        this.trashItem = new PlaceMenuItem(this.menu, _("Trash"), uri, iName);
        this.userSection.addMenuItem(this.trashItem);
    },
    
    setPanelIcon: function() {
        if ( this.panelIcon == "" ||
           ( GLib.path_is_absolute(this.panelIcon) &&
             GLib.file_test(this.panelIcon, GLib.FileTest.EXISTS) ) ) {
            if ( this.panelIcon.search("-symbolic.svg") == -1 ) this.set_applet_icon_path(this.panelIcon);
            else this.set_applet_icon_symbolic_path(this.panelIcon);
        }
        else if ( Gtk.IconTheme.get_default().has_icon(this.panelIcon) ) {
            if ( this.panelIcon.search("-symbolic") != -1 ) this.set_applet_icon_symbolic_name(this.panelIcon);
            else this.set_applet_icon_name(this.panelIcon);
        }
        else this.set_applet_icon_name("folder");
    },
    
    setPanelText: function() {
        if ( this.panelText ) this.set_applet_label(this.panelText);
        else this.set_applet_label("");
    },
    
    search: function(a, b, directory) {
        this.menu.close();
        let command = this.metadata.path + "/search.py ";
        if ( directory ) command += directory;
        Util.spawnCommandLine(command);
    },
    
    set_applet_icon_symbolic_path: function(icon_path) {
        if (this._applet_icon_box.child) this._applet_icon_box.child.destroy();
        
        if (icon_path){
            let file = Gio.file_new_for_path(icon_path);
            let gicon = new Gio.FileIcon({ file: file });
            if (this._scaleMode) {
                let height = (this._panelHeight / DEFAULT_PANEL_HEIGHT) * PANEL_SYMBOLIC_ICON_DEFAULT_HEIGHT;
                this._applet_icon = new St.Icon({gicon: gicon, icon_size: height,
                                                icon_type: St.IconType.SYMBOLIC, reactive: true, track_hover: true, style_class: 'applet-icon' });
            } else {
                this._applet_icon = new St.Icon({gicon: gicon, icon_size: 22, icon_type: St.IconType.FULLCOLOR, reactive: true, track_hover: true, style_class: 'applet-icon' });
            }
            this._applet_icon_box.child = this._applet_icon;
        }
        this.__icon_type = -1;
        this.__icon_name = icon_path;
    }
}


function main(metadata, orientation, panel_height, instanceId) {
    let myApplet = new MyApplet(metadata, orientation, panel_height, instanceId);
    return myApplet;
}
