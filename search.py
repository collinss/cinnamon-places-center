#!/usr/bin/env python

import sys, os, threading
from gi.repository import Gio, Gtk, GLib, GObject, Pango, GdkPixbuf


def launch(path):
    print path
    fileObj = Gio.File.new_for_path(path)
    Gio.app_info_launch_default_for_uri(fileObj.get_uri(), Gio.AppLaunchContext())


class SearchBox(Gtk.Entry):
    def __init__(self, searchCommand):
        Gtk.Entry.__init__(self)
        self.searchCommand = searchCommand
        
        self.set_icon_from_icon_name(Gtk.EntryIconPosition.PRIMARY, "edit-find-symbolic")
        self.set_icon_from_icon_name(Gtk.EntryIconPosition.SECONDARY, "edit-clear-symbolic")
        
        self.connect("icon-press", self.onClick)
        
        self.connect("activate", self.searchCommand)
    
    def onClick(self, target, pos, event):
        if pos == Gtk.EntryIconPosition.PRIMARY and not self.get_text == "":
            self.searchCommand()
        if pos == Gtk.EntryIconPosition.SECONDARY:
            self.set_text("")


class Context(Gtk.Menu):
    def __init__(self, parent):
        Gtk.Menu.__init__(self)
        
        self.parent = parent
        
        self.attach_to_widget(parent, None)
        
        launch = Gtk.MenuItem()
        launch.set_label("Open...")
        launch.connect("activate", self.launchItem)
        self.append(launch)
        
        openFolder = Gtk.MenuItem()
        openFolder.set_label("Open Containing Folder...")
        openFolder.connect("activate", self.openFolder)
        self.append(openFolder)
        
        parent.connect("button-press-event", self.openContext)
        parent.connect("popup-menu", self.openContext)
        
        self.show_all()
    
    def openContext(self, target, event=None):
        if event is None or event.button == 3:
            self.popup(None, None, None, None, 0, Gtk.get_current_event_time())
            return True
        return False
    
    def launchItem(self, a):
        model, iter = self.parent.get_selection().get_selected()
        launch(os.path.join(model[iter][2], model[iter][1]))
    
    def openFolder(self, a):
        model, iter = self.parent.get_selection().get_selected()
        launch(model[iter][2])


class SearchWindow(Gtk.Window):
    searching = False
    
    def __init__(self, basePath):
        Gtk.Window.__init__(self, title="Search", icon_name="edit-find")
        self.connect("destroy", self.quit)
        
        self.search = None
        self.basePath = basePath
        self.results = Gtk.ListStore(str, str, str)
        
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, border_width = 10)
        self.add(box)
        
        self.searchBox = SearchBox(self.startSearch)
        box.pack_start(self.searchBox, False, False, 5)
        
        #search status
        hbox = Gtk.Box()
        box.pack_start(hbox, False, False, 5)
        
        self.currentLabel = Gtk.Label()
        self.currentLabel.set_ellipsize(Pango.EllipsizeMode.END)
        hbox.pack_start(self.currentLabel, False, False, 5)
        
        stopButton = Gtk.Button(label = "Stop")
        hbox.pack_end(stopButton, False, False, 5)
        stopButton.connect("clicked", self.stopSearch)
        
        #results display tree
        scrollBox = Gtk.ScrolledWindow(width_request = 500, height_request = 250)
        box.pack_start(scrollBox, True, True, 5)
        tree = Gtk.TreeView(self.results)
        scrollBox.add(tree)
        
        fileNameColumn = Gtk.TreeViewColumn()
        fileNameColumn.set_title("File")
        fileNameColumn.set_resizable(True)
        fileNameColumn.set_sizing(Gtk.TreeViewColumnSizing.FIXED)
        fileNameColumn.set_fixed_width(200)
        tree.append_column(fileNameColumn)
        
        iconRenderer = Gtk.CellRendererPixbuf()
        fileNameColumn.pack_start(iconRenderer, expand=False)
        fileNameColumn.add_attribute(iconRenderer, "icon-name", 0)
        
        fileNameRenderer = Gtk.CellRendererText(ellipsize=Pango.EllipsizeMode.END)
        fileNameColumn.pack_start(fileNameRenderer, expand=False)
        fileNameColumn.add_attribute(fileNameRenderer, "text", 1)
        
        pathRenderer = Gtk.CellRendererText()
        pathColumn = Gtk.TreeViewColumn("Path", pathRenderer, text=2)
        tree.append_column(pathColumn)
        
        #context menu
        Context(tree)
        tree.connect("row-activated", self.launchItem)
        
        #bottom buttons
        buttonBox = Gtk.Box()
        box.pack_end(buttonBox, False, False, 0)
        self.closeButton = Gtk.Button(stock=Gtk.STOCK_CLOSE)
        buttonBox.pack_end(self.closeButton, False, False, 5)
        self.closeButton.connect("clicked", self.quit)
        
        self.show_all()
    
    def quit(self, widget):
        self.stopSearch()
        Gtk.main_quit()
    
    def startSearch(self, a=None):
        if self.searching:
            self.stopSearch()
            GObject.idle_add(self.startSearch)
            return
        
        self.results.clear()
        self.setStatusText("Searching...")
        
        self.searching = True
        
        self.search = threading.Thread(target=self.searchDirectory, args=[self.basePath, self.searchBox.get_text(), True])
        self.search.start()
    
    def stopSearch(self, a=None):
        self.searching = False
        if not self.search is None:
            self.search.join();
            self.search = None
        self.setStatusText("Search Stopped")
    
    def launchItem(self, event, path, column):
        row = self.results[path]
        launch(os.path.join(row[2], row[1]))
    
    def addResult(self, fileName, path, icon):
        if not self.searching:
            return
        
        self.results.append([icon, fileName, path])
    
    def setStatusText(self, text):
        if self.searching:
            self.currentLabel.set_text(text)
    
    def searchDirectory(self, directory, key, firstRun=False):
        if not self.searching:
            return
        GObject.idle_add(self.setStatusText, "Searching: " + directory)
        
        try:
            children = os.listdir(directory)
        except:
            GObject.idle_add(self.setStatusText, "Error: insufficient permissions to read folder " + directory)
            return
        
        subdirs = []
        for child in children:
            if child[0] != ".":
                path = os.path.join(directory,child)
                if key in child:
                    fileObj = Gio.File.new_for_path(path)
                    info = fileObj.query_info("standard::icon", 0, None)
                    iconNames = info.get_icon().get_names()
                    for icon in iconNames:
                        if Gtk.IconTheme.get_default().has_icon(icon):
                            break
                    if not self.searching:
                        return
                    GObject.idle_add(self.addResult, child, directory, icon)
                try:
                    if os.path.isdir(path) and not os.path.islink(path):
                        subdirs.append(path)
                except:
                    pass
            
        
        for directory in subdirs:
            if not self.searching:
                return
            self.searchDirectory(directory, key)
        
        if firstRun:
            GObject.idle_add(self.setStatusText, "Search Completed")


if __name__ == "__main__":
    GLib.threads_init()
    if len(sys.argv) > 1:
        SearchWindow(sys.argv[1])
    else:
        SearchWindow("/")
    
    Gtk.main()
