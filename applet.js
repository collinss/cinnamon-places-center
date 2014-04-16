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
            
            let contentBox = new St.BoxLayout({ style_class: "about-content" });
            this.contentLayout.add_actor(contentBox);
            
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
            contentBox.add_actor(icon);
            
            let textBox = new St.BoxLayout({ vertical: true });
            contentBox.add_actor(textBox);
            
            let titleBox = new St.BoxLayout();
            textBox.add_actor(titleBox);
            
            let title = new St.Label({ text: metadata.name, style_class: "about-title" });
            titleBox.add_actor(title);
            
            if ( metadata.version ) {
                let versionBin = new St.Bin({ x_align: St.Align.START, y_align: St.Align.END});
                titleBox.add_actor(versionBin);
                let version = new St.Label({ text: "v " + metadata.version, style_class: "about-version" });
                versionBin.add_actor(version);
            }
            
            let uuid = new St.Label({ text: metadata.uuid, style_class: "about-uuid" });
            textBox.add_actor(uuid);
            
            let desc = new St.Label({ text: metadata.description, style_class: "about-description" });
            let text = desc.clutter_text;
            text.ellipsize = Pango.EllipsizeMode.NONE;
            text.line_wrap = true;
            text.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
            textBox.add_actor(desc);
            
            if ( metadata.website ) {
                let wsButton = new St.Button({ x_align: St.Align.START, style_class: "cinnamon-link", name: "about-website" });
                textBox.add_actor(wsButton);
                let website = new St.Label({ text: metadata.website });
                let wtext = website.clutter_text;
                wtext.ellipsize = Pango.EllipsizeMode.NONE;
                wtext.line_wrap = true;
                wtext.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
                wsButton.add_actor(website);
                wsButton.connect("clicked", Lang.bind(this, this.launchSite, metadata.website));
            }
            
            if ( metadata.contributors ) {
                let label = new St.Label({ text: "Contributors: " });
                textBox.add_actor(label);
                
                let list = metadata.contributors.split(",");
                for ( let i = 0; i < list.length; i++ ) {
                    let name = new St.Label({ text: list[i], style_class: "about-name" });
                    textBox.add_actor(name);
                }
            }
            
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
            
            this._applet_context_menu.addAction("About...", Lang.bind(this, this.openAbout));
            
            //listen for changes
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.recentManager = new Gtk.RecentManager();
            this.recentManager.connect("changed", Lang.bind(this, this.buildRecentDocumentsSection));
            Main.placesManager.connect("bookmarks-updated", Lang.bind(this, this.buildBookmarksSection));
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
        this.settings.bindProperty(Settings.BindingDirection.IN, "symbolicPanelIcon", "symbolicPanelIcon", this.setPanelIcon);
        this.settings.bindProperty(Settings.BindingDirection.IN, "panelText", "panelText", this.setPanelText);
        this.settings.bindProperty(Settings.BindingDirection.IN, "iconSize", "iconSize", this.buildMenu)
        this.settings.bindProperty(Settings.BindingDirection.IN, "showBookmarks", "showBookmarks", this.buildMenu);
        this.settings.bindProperty(Settings.BindingDirection.IN, "showComputer", "showComputer", this.buildSystemSection);
        this.settings.bindProperty(Settings.BindingDirection.IN, "showRoot", "showRoot", this.buildSystemSection);
        this.settings.bindProperty(Settings.BindingDirection.IN, "showVolumes", "showVolumes", this.buildSystemSection);
        this.settings.bindProperty(Settings.BindingDirection.IN, "showNetwork", "showNetwork", this.buildSystemSection);
        this.settings.bindProperty(Settings.BindingDirection.IN, "showTrash", "showTrash", this.buildTrashItem);
        this.settings.bindProperty(Settings.BindingDirection.IN, "customPlaces", "customPlaces", this.buildSystemSection);
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
            let mainBox = new St.BoxLayout({ style_class: "menu-applications-box", vertical: false });
            section.actor.add_actor(mainBox);
            
            //User section
            if ( this.showBookmarks ) {
                let bookmarkPane = new PopupMenu.PopupMenuSection();
                let title = new PopupMenu.PopupBaseMenuItem({ reactive: false });
                bookmarkPane.addMenuItem(title);
                title.addActor(new St.Label({ text: GLib.get_user_name().toUpperCase() }));
                
                //add link to search tool
                let searchButton = new St.Button();
                title.addActor(searchButton);
                let image = new St.Icon({ icon_name: "edit-find", icon_size: 10, icon_type: St.IconType.SYMBOLIC });
                searchButton.add_actor(image);
                searchButton.connect("clicked", Lang.bind(this, this.search, GLib.get_home_dir()));
                new Tooltips.Tooltip(searchButton, _("Search Home Folder"));
                
                this.bookmarkSection = new PopupMenu.PopupMenuSection();
                bookmarkPane.addMenuItem(this.bookmarkSection);
                
                mainBox.add_actor(bookmarkPane.actor, { span: 1 });
                this.buildBookmarksSection();
                
                let paddingBox = new St.BoxLayout();
                paddingBox.set_width(MENU_PADDING_WIDTH);
                mainBox.add_actor(paddingBox);
            }
            
            //system section
            let systemPane = new PopupMenu.PopupMenuSection();
            let title = new PopupMenu.PopupBaseMenuItem({ reactive: false });
            systemPane.addMenuItem(title);
            title.addActor(new St.Label({ text: _("SYSTEM") }));
            
            //add link to search tool
            let searchButton = new St.Button();
            title.addActor(searchButton);
            let image = new St.Icon({ icon_name: "edit-find", icon_size: 10, icon_type: St.IconType.SYMBOLIC });
            searchButton.add_actor(image);
            searchButton.connect("clicked", Lang.bind(this, this.search));
            new Tooltips.Tooltip(searchButton, _("Search File System"));
            
            this.systemSection = new PopupMenu.PopupMenuSection();
            systemPane.addMenuItem(this.systemSection);
            
            mainBox.add_actor(systemPane.actor, { span: 1 });
            this.buildSystemSection();
            
            let paddingBox = new St.BoxLayout();
            paddingBox.set_width(MENU_PADDING_WIDTH);
            mainBox.add_actor(paddingBox);
            
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
    
    buildBookmarksSection: function() {
        this.bookmarkSection.removeAll();
        
        let defaultPlaces = Main.placesManager.getDefaultPlaces();
        let defaultPlaces = [defaultPlaces[0], defaultPlaces[1]];
        let bookmarks = defaultPlaces.concat(Main.placesManager.getBookmarks());
        
        for ( let i = 0; i < bookmarks.length; i++) {
            let bookmark = new BookmarkMenuItem(this.menu, bookmarks[i]);
            this.bookmarkSection.addMenuItem(bookmark);
        }
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
        this.buildCustomPlaces();
        
        //network items
        if ( this.showNetwork ) {
            let network = new PlaceMenuItem(this.menu, _("Network"), "network:///", "network-workgroup");
            this.systemSection.addMenuItem(network);
            
            let connectToItem = new BookmarkMenuItem(this.menu, Main.placesManager.getDefaultPlaces()[2]);
            this.systemSection.addMenuItem(connectToItem);
        }
        
        //trash
        this.buildTrashItem();
    },
    
    buildCustomPlaces: function() {
        if ( this.customPlaces == "" ) return;
        let uris = [];
        let customPlaces = this.customPlaces.split(",");
        
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
        
        let customPlacesSection = new PopupMenu.PopupMenuSection();
        for ( let i = 0; i < uris.length; i++ ) {
            let customPlace = new CustomMenuItem(this.menu, uris[i]);
            customPlacesSection.addMenuItem(customPlace);
        }
        this.systemSection.addMenuItem(customPlacesSection);
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
        this.buildBookmarksSection();
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
        this.systemSection.addMenuItem(this.trashItem);
    },
    
    setPanelIcon: function() {
        if ( this.panelIcon.split("/").length > 1 ) {
            if ( this.symbolicPanelIcon && this.panelIcon.search("-symbolic.svg") > 0 ) this.set_applet_icon_symbolic_path(this.panelIcon);
            else this.set_applet_icon_path(this.panelIcon);
        }
        else {
            if ( this.symbolicPanelIcon ) this.set_applet_icon_symbolic_name(this.panelIcon);
            else this.set_applet_icon_name(this.panelIcon);
        }
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
