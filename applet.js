const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const St = imports.gi.St;

const Applet = imports.ui.applet;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;
const Tooltips = imports.ui.tooltips;

const Util = imports.misc.util;
const Lang = imports.lang;

const MENU_ITEM_TEXT_LENGTH = 25;
const MENU_PADDING_WIDTH = 25;
const UUID = "placesCenter@scollins";
let menu_item_icon_size;

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


function MyApplet(orientation, panel_height, instanceId) {
    this._init(orientation, panel_height, instanceId);
}

MyApplet.prototype = {
    __proto__: Applet.TextIconApplet.prototype,
    
    _init: function(orientation, panel_height, instanceId) {
        try {
            
            this.orientation = orientation;
            Applet.TextIconApplet.prototype._init.call(this, this.orientation, panel_height);
            
            //initiate settings
            this.settings = new Settings.AppletSettings(this, "placesCenter@scollins", instanceId);
            this.settings.bindProperty(Settings.BindingDirection.IN, "panelIcon", "panelIcon", this._set_panel_icon);
            this.settings.bindProperty(Settings.BindingDirection.IN, "panelText", "panelText", this._set_panel_text);
            this.settings.bindProperty(Settings.BindingDirection.IN, "iconSize", "iconSize", this.build_menu)
            this.settings.bindProperty(Settings.BindingDirection.IN, "showBookmarks", "showBookmarks", this.build_menu);
            this.settings.bindProperty(Settings.BindingDirection.IN, "showComputer", "showComputer", this._build_system_section);
            this.settings.bindProperty(Settings.BindingDirection.IN, "showRoot", "showRoot", this._build_system_section);
            this.settings.bindProperty(Settings.BindingDirection.IN, "showVolumes", "showVolumes", this._build_system_section);
            this.settings.bindProperty(Settings.BindingDirection.IN, "showNetwork", "showNetwork", this._build_system_section);
            this.settings.bindProperty(Settings.BindingDirection.IN, "showTrash", "showTrash", this._build_trash_item);
            this.settings.bindProperty(Settings.BindingDirection.IN, "customPlaces", "customPlaces", this._build_system_section);
            this.settings.bindProperty(Settings.BindingDirection.IN, "showRecentDocuments", "showRecentDocuments", this.build_menu);
            this.settings.bindProperty(Settings.BindingDirection.IN, "recentSizeLimit", "recentSizeLimit", this._build_recent_documents_section);
            
            //set up panel
            this._set_panel_icon();
            this._set_panel_text();
            this.set_applet_tooltip(_("Places"));
            
            //listen for changes in places
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.recentManager = new Gtk.RecentManager();
            this.recentManager.connect("changed", Lang.bind(this, this._build_recent_documents_section));
            Main.placesManager.connect("bookmarks-updated", Lang.bind(this, this._build_bookmarks_section));
            this.volumeMonitor = Gio.VolumeMonitor.get();
            this.volumeMonitor.connect("volume-added", Lang.bind(this, this._update_volumes));
            this.volumeMonitor.connect("volume-removed", Lang.bind(this, this._update_volumes));
            this.volumeMonitor.connect("mount-added", Lang.bind(this, this._update_volumes));
            this.volumeMonitor.connect("mount-removed", Lang.bind(this, this._update_volumes));
            
            this.build_menu();
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    on_applet_clicked: function(event) {
        this.menu.toggle();
    },
    
    build_menu: function() {
        try {
            
            if ( this.menu ) {
                this.menu.destroy();
            }
            
            menu_item_icon_size = this.iconSize;
            
            this.menu = new Applet.AppletPopupMenu(this, this.orientation);
            this.menuManager.addMenu(this.menu);
            let section = new PopupMenu.PopupMenuSection();
            this.menu.addMenuItem(section);
            let mainBox = new St.BoxLayout({ style_class: 'menu-applications-box', vertical: false });
            section.actor.add_actor(mainBox);
            
            //User section
            if ( this.showBookmarks ) {
                
                let bookmarkPane = new PopupMenu.PopupMenuSection();
                let title = new PopupMenu.PopupMenuItem(GLib.get_user_name().toUpperCase() , { reactive: false });
                bookmarkPane.addMenuItem(title);
                
                this.bookmarkSection = new PopupMenu.PopupMenuSection();
                bookmarkPane.addMenuItem(this.bookmarkSection);
                
                mainBox.add_actor(bookmarkPane.actor, { span: 1 });
                this._build_bookmarks_section();
                
                let paddingBox = new St.BoxLayout();
                paddingBox.set_width(MENU_PADDING_WIDTH);
                mainBox.add_actor(paddingBox);
                
            }
            
            //system section
            let systemPane = new PopupMenu.PopupMenuSection();
            let title = new PopupMenu.PopupMenuItem(_("SYSTEM"), { reactive: false });
            systemPane.addMenuItem(title);
            
            this.systemSection = new PopupMenu.PopupMenuSection();
            systemPane.addMenuItem(this.systemSection);
            
            mainBox.add_actor(systemPane.actor, { span: 1 });
            this._build_system_section();
            
            let paddingBox = new St.BoxLayout();
            paddingBox.set_width(MENU_PADDING_WIDTH);
            mainBox.add_actor(paddingBox);
            
            //recent documents section
            if ( this.showRecentDocuments ) {
                
                let documentPane = new PopupMenu.PopupMenuSection();
                let title = new PopupMenu.PopupMenuItem(_("RECENT DOCUMENTS"), { reactive: false });
                documentPane.addMenuItem(title);
                
                let recentScrollBox = new St.ScrollView({ x_fill: true, y_fill: false, y_align: St.Align.START });
                this.recentSection = new PopupMenu.PopupMenuSection();
                documentPane.actor.add_actor(recentScrollBox);
                recentScrollBox.add_actor(this.recentSection.actor);
                
                let clearRecent = new ClearRecentMenuItem(this.menu, this.recentManager);
                documentPane.addMenuItem(clearRecent);
                
                mainBox.add_actor(documentPane.actor, { span: 1 });
                this._build_recent_documents_section();
                
            }
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    _build_bookmarks_section: function() {
        
        this.bookmarkSection.removeAll();
        
        let defaultPlaces = Main.placesManager.getDefaultPlaces();
        let defaultPlaces = [defaultPlaces[0], defaultPlaces[1]];
        bookmarks = defaultPlaces.concat(Main.placesManager.getBookmarks());
        
        for ( let i = 0; i < bookmarks.length; i++) {
            let bookmark = new BookmarkMenuItem(this.menu, bookmarks[i]);
            this.bookmarkSection.addMenuItem(bookmark);
        }
        
    },
    
    _build_system_section: function() {
        
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
        
        //custom places
        this._build_custom_places();
        
        //volumes and mounts
        if ( this.showVolumes ) {
            this.devicesSection = new PopupMenu.PopupMenuSection();
            this.systemSection.addMenuItem(this.devicesSection);
            this._build_devices_section();
        }
        
        //network items
        if ( this.showNetwork ) {
            let network = new PlaceMenuItem(this.menu, _("Network"), "network:///", "network-workgroup");
            this.systemSection.addMenuItem(network);
            
            let connectToItem = new BookmarkMenuItem(this.menu, Main.placesManager.getDefaultPlaces()[2]);
            this.systemSection.addMenuItem(connectToItem);
        }
        
        //trash
        this._build_trash_item();
        
    },
    
    _build_custom_places: function() {
        
        if ( this.customPlaces == "" ) return;
        let uris = [];
        let customPlaces = this.customPlaces.split(",");
        
        for ( let i = 0; i < customPlaces.length; i++ ) {
            if ( customPlaces[i] == "" ) continue;
            try {
                if ( customPlaces[i].search("://") == -1 ) {
                    let file = Gio.File.new_for_path(customPlaces[i]);
                    if ( file.query_exists(null) ) uris.push("file://" + customPlaces[i]);
                }
                else {
                    let file = Gio.File.new_for_uri(customPlaces[i]);
                    if ( file.query_exists(null) ) uris.push(customPlaces[i]);
                }
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
    
    _build_devices_section: function() {
        
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
    
    _build_recent_documents_section: function() {
        
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
    
    _update_volumes: function() {
        
        if ( this.updatingDevices ) return;
        this.updatingDevices = true;
        this._build_devices_section();
        this.updatingDevices = false;
        
    },
    
    _build_trash_item: function() {
        
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
        this.trashMonitorConnectId = this.trashMonitor.connect("changed", Lang.bind(this, this._build_trash_item));
        
        if ( this.showTrash == 2 && trashcanEmpty ) return;
        
        iName = ( trashcanEmpty ) ? "trashcan_empty" : "trashcan_full";
        
        this.trashItem = new PlaceMenuItem(this.menu, _("Trash"), uri, iName);
        this.systemSection.addMenuItem(this.trashItem);
        
    },
    
    _set_panel_icon: function() {
        if ( this.panelIcon.split("/").length > 1 ) this.set_applet_icon_path(this.panelIcon);
        else this.set_applet_icon_name(this.panelIcon);
    },
    
    _set_panel_text: function() {
        if ( this.panelText ) this.set_applet_label(this.panelText);
        else this.set_applet_label("");
    }
}


function main(metadata, orientation, panel_height, instanceId) {
    let myApplet = new MyApplet(orientation, panel_height, instanceId);
    return myApplet;
}
