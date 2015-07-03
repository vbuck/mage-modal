/**
 * MageModal core library.
 * 
 * @todo Button management
 *
 * Note about modal open states. There are 3 ways to measure this:
 * 
 *      1. _isOpen      An arbitrary flag used to bootstrap static modals.
 *      2. getIsOpen    Detects open state based on presence of 'open' class.
 *      3. _openFlag    A one-time flag used to defer auto-opening.
 *
 * @package   Vbuck_MageModal
 * @author    Rick Buczynski <me@rickbuczynski.com>
 * @copyright 2015 Rick Buczynski
 */

var MageModal = Class.create();
MageModal.prototype = {

    _counter    : 0,
    _el         : null,
    _events     : {},
    _id         : null,
    _isOpen     : false,
    _openFlag   : false,
    _options    : {},
    _setters    : {},
    _template   : '\n\
        <div class="modal-glass generated">\n\
            <div class="modal generated">\n\
                <header></header>\n\
                <section></section>\n\
                <footer></footer>\n\
            </div>\n\
        </div>\n\
    ',

    /**
     * Get a unique ID for the modal instance.
     * 
     * @return string
     */
    _getId: function(prefix) {
        return ( prefix ? prefix : 'modal_' ) + ( (new Date()).getTime() + ( ++MageModal.prototype._counter ) ).toString();
    },

    /**
     * Get the pre-render options.
     * 
     * @return array
     */
    _getPreRenderOptions: function() {
        return [
            'bindKey',
            'clickToggle',
            'destroyOnClose',
            'enablePositionChanges',
            'id',
            'onClose',
            'onOpen',
            'onRenderAfter',
            'onRenderBefore',
            'onResize'
        ];
    },

    /**
     * Sort options by render order.
     * 
     * @return array
     */
    _getRenderOptions: function() {
        var order = [
            'autoOpen',
            'useGlass',
            'content',
            'useFrame',
            'source',
            'footer',
            'showFooter',
            'header',
            'showHeader',
            'position',
            'left',
            'top',
            'width',
            'height'
        ];

        // Items not ordered are appended
        var options = [], other = [], exclude = this._getPreRenderOptions();

        for(var key in this._options) {
            if (order.indexOf(key) == -1 && exclude.indexOf(key) == -1) {
                other.push({
                    'key'   : key,
                    value   : this._options[key]
                });
            } else if (exclude.indexOf(key) == -1) { // Some options are pre-render, exclude them
                options[order.indexOf(key)] = {
                    'key'   : key,
                    value   : this._options[key]
                };
            }
        }

        return options.concat(other);
    },

    /**
     * Hide the modal
     * 
     * @return MageModal
     */
    _hide: function() {
        this._el.removeClassName('open');

        if(this.get('useGlass')) {
            this._el.down('.modal').removeClassName('open');
        }

        // Delay allows CSS3 transitions
        setTimeout((function() {
            this._el.style.display = 'none';
            
            if (this.get('useGlass')) {
                this._el.down('.modal').display = 'none';
            }
        }).bind(this), 325);

        if (this.get('clickToggle')) {
            this.setClickToggle(false);
        }

        return this;
    },

    /**
     * Configure the modal element for use.
     * 
     * @return MageModal
     */
    _prepareElement: function() {
        this._el.modal = this;

        if (!document.body.contains(this._el)) {
            document.body.appendChild(this._el);
        }

        if (this._el.id) {
            this._id = this._el.id;
        } else {
            this._el.id = this._id;
        }

        // Report an open state if class was set externally
        if (this._el.hasClassName('open')) {
            this._isOpen = true;
        }

        // Run pre-renderers
        this._getPreRenderOptions().each((function(option) {
            if (typeof this._setters[option] == 'function') {
                this._setters[option].call(this._setters[option], this._el, this.get(option));
            }
        }).bind(this));

        // Observe resizing
        Event.observe(window, 'resize', this.resize.bind(this));

        return this;
    },

    /**
     * Pull down global event listeners from the prototype.
     * 
     * @return MageModal
     */
    _prepareEvents: function() {
        this._events = Object.extend(this._events, MageModal.prototype._events);

        return this;
    },

    /**
     * Setup keyboard controls.
     * 
     * @return MageModal
     */
    _prepareInput: function() {
        Event.observe(window, 'keydown', (function(event) {
            if (this.getIsOpen()) {
                // Positional changes
                if ( 
                    event.ctrlKey && 
                    this.get('position') != 'tooltip' &&
                    this.get('position') != 'gallery'
                ) {
                    switch (event.keyCode) {
                        case 37 :
                            if (this.get('enable_position_changes') === true) {
                                if (this.get('lastKey') == 37) {
                                    this.resetPosition(true);
                                }

                                this.set('position', 'from-left');
                            }

                            break;
                        case 38 :
                            if (this.get('enable_position_changes') === true) {
                                if (this.get('lastKey') == 38) {
                                    this.resetPosition(true);
                                }

                                this.set('position', 'from-top');
                            }

                            break;
                        case 39 :
                            if (this.get('enable_position_changes') === true) {
                                if (this.get('lastKey') == 39) {
                                    this.resetPosition(true);
                                }

                                this.set('position', 'from-right');
                            }

                            break;
                        case 40 :
                            if (this.get('enable_position_changes') === true) {
                                if (this.get('lastKey') == 40) {
                                    this.resetPosition(true);
                                }

                                this.set('position', 'from-bottom');
                            }

                            break;
                        case 48 :
                            if (this.get('lastKey') == 48) {
                                this.resetPosition(true);
                            }

                            this.set('position', '');

                            break;
                        default:
                            break;
                    }

                    // Tracks double-calls which will reset positioning
                    this.set(true, 'lastKey', event.keyCode);
                } else if (event.keyCode == 27) {
                    this.close();
                }
            }
        }).bind(this));

        return this;
    },

    /**
     * Register option renderers.
     * 
     * @return MageModal
     */
    _registerSetters: function() {
        this._setters = {};

        var method, options = this.getDefaults();

        for (var key in options) {
            method = '_set' + key; // eg: _setuseGlass

            // Method must exist
            if (typeof this[method] == 'function') {
                this._setters[key] = this[method];
            }
        }

        return this;
    },

    /**
     * Backend option setter, does not render or trigger events.
     * 
     * @param object options An option data set.
     * 
     * @return MageModal
     */
    _set: function(options) {
        for (var key in options) {
            this._options[key] = options[key];
        }

        return this;
    },

    /**
     * Set the key binding for modal visibility toggle.
     * 
     * @param HTMLElement el    The modal element instance.
     * @param number      value The key to bind.
     * 
     * @return void
     */
    _setbindKey: function(el, value) {
        if (value && isNaN(parseInt(value, 10))) {
            value = value.toUpperCase().charCodeAt(0);
        }

        if ( (key = parseInt(value, 10)) ) {
            value = (function(el, key, event) {
                if (event.keyCode == key) {
                    el.modal.toggle();
                }
            }).bind(null, el, key);
        }

        if (typeof value == 'function') {
            // Unbind existing event
            if (el.modal.get('keyEvent')) {
                Event.stopObserving(window, 'keydown', el.modal.get('keyEvent'));
            }

            Event.observe(window, 'keydown', value)
            el.modal.set(true, 'keyEvent', value);
        }
    },

    /**
     * Content renderer.
     * 
     * @param HTMLElement el    The modal element instance.
     * @param string      value The modal dialog content.
     * 
     * @return void
     */
    _setcontent: function(el, value) {
        if (value !== null) {
            el.modal.getBody().update('<div>' + value + '</div>');
        }
    },

    /**
     * Enable or disable modal position changes.
     *
     * @param HTMLElement el    The modal element instance.
     * @param boolean     value The positional change flag state.
     * 
     * @return void
     */
    _setenablePositionChanges: function(el, value) {
        if (value !== true) {
            value = false;
        }

        el.set('enable_position_changes', value);
    },

    /**
     * Modal click toggle renderer.
     * 
     * @param HTMLElement el    The modal element instance.
     * @param boolean     value The click toggle flag state.
     * 
     * @return void
     */
    _setclickToggle: function(el,value) {
        if (!value) {
            el.modal.setClickToggle(false);
        } else {
            el.modal.setClickToggle(true);
        }
    },

    /**
     * Modal auto-destroy renderer.
     * 
     * @param HTMLElement el    The modal element instance.
     * @param boolean     value The auto-destroy flag state.
     * 
     * @return void
     */
    _setdestroyOnClose: function(el, value) {
        if (value) {
            el.modal.onClose((function() {
                this.destroy();
            }).bind(el.modal));
        }
    },

    /**
     * Footer content renderer.
     * 
     * @param HTMLElement el    The modal element instance.
     * @param string      value The modal footer content.
     * 
     * @return void
     */
    _setfooter: function(el,value) {
        if (value !== null) {
            el.modal.getFooter().update(value);
        }
    },

    /**
     * Header content renderer.
     * 
     * @param HTMLElement el    The modal element instance.
     * @param mixed       value The modal header content.
     * 
     * @return void
     */
    _setheader: function(el, value) {
        if (value !== null) {
            el.modal.getHeader().update('<h2 class="title">' + value + '</h2>');
        }
    },

    /**
     * Modal custom height renderer.
     * 
     * @param HTMLElement el    The modal element instance.
     * @param mixed       value The modal height value.
     * 
     * @return void
     */
    _setheight: function(el, value) {
        el.modal.setDimension('height', value);
    },

    /**
     * Modal ID renderer.
     *
     * @param HTMLElement el    The modal element instance.
     * @param string      value The instance ID.
     * 
     * @return void
     */
    _setid: function(el, value) {
        if (value) {
            el.modal.setId(value);
        }
    },

    /**
     * Modal custom left offset renderer.
     * 
     * @param HTMLElement el    The modal element instance.
     * @param mixed       value The left offset value.
     * 
     * @return void
     */
    _setleft: function(el, value) {
        el.modal.setDimension('left', value);
    },

    /**
     * onClose event renderer.
     * 
     * @param HTMLElement el    The modal element instance.
     * @param mixed       value The onClose callback function or script.
     * 
     * @return void
     */
    _setonClose: function(el, value) {
        if (typeof value != 'function') {
            var script = value;

            value = function(modal) {
                eval(script);
            }
        }

        el.modal.onClose(value);
    },

    /**
     * onOpen event renderer.
     * 
     * @param HTMLElement el    The modal element instance.
     * @param mixed       value The onOpen callback function or script.
     * 
     * @return void
     */
    _setonOpen: function(el, value) {
        if (typeof value != 'function') {
            var script = value;

            value = function(modal) {
                eval(script);
            }
        }
        
        el.modal.onOpen(value);
    },

    /**
     * onRenderAfter event renderer.
     * 
     * @param HTMLElement el    The modal element instance.
     * @param mixed       value The onRenderAfter callback function or script.
     * 
     * @return void
     */
    _setonRenderAfter: function(el, value) {
        if (typeof value != 'function') {
            var script = value;

            value = function(modal) {
                eval(script);
            }
        }
        
        el.modal.onRenderAfter(value);
    },

    /**
     * onRenderBefore event renderer.
     * 
     * @param HTMLElement el    The modal element instance.
     * @param mixed       value The onRenderBefore callback function or script.
     * 
     * @return void
     */
    _setonRenderBefore: function(el, value) {
        if (typeof value != 'function') {
            var script = value;

            value = function(modal) {
                eval(script);
            }
        }
        
        el.modal.onRenderBefore(value);
    },

    /**
     * onResize event renderer.
     * 
     * @param HTMLElement el    The modal element instance.
     * @param mixed       value The onResize callback function or script.
     * 
     * @return void
     */
    _setonResize: function(el, value) {
        if (typeof value != 'function') {
            var script = value;

            value = function(modal) {
                eval(script);
            }
        }
        
        el.modal.onResize(value);
    },

    /**
     * Modal position renderer.
     * 
     * @param HTMLElement el    The modal element instance.
     * @param mixed       value The positional class.
     * 
     * @return void
     */
    _setposition: function(el, value) {
        // Reset custom dimensions
        el.modal.resetPosition();

        if (value && el.modal.getDialog()) {
            el.modal.getDialog().addClassName(value);
        }
    },

    /**
     * Footer visibility renderer.
     * 
     * @param HTMLElement el    The modal element instance.
     * @param mixed       value The footer visibility flag state.
     * 
     * @return void
     */
    _setshowFooter: function(el, value) {
        // Always hide footer in tooltip mode
        if (el.modal.get('position') == 'tooltip') {
            value = false;
            el.modal.set(true, 'showFooter', false);
        }

        el.modal.getFooter().style.display = value ? 'block' : 'none';
    },


    /**
     * Header visibility renderer.
     * 
     * @param HTMLElement el    The modal element instance.
     * @param mixed       value The header visibility flag state.
     * 
     * @return void
     */
    _setshowHeader: function(el, value) {
        // Always hide header in tooltip mode
        if (el.modal.get('position') == 'tooltip') {
            value = false;

            el.modal.set(true, 'showHeader', false);
        }

        el.modal.getHeader().style.display = value ? 'block' : 'none';
    },


    /**
     * External source content renderer.
     * 
     * @param HTMLElement el    The modal element instance.
     * @param mixed       value The modal content source URL.
     * 
     * @return void
     */
    _setsource: function(el, value) {
        if (value) {
            var content = el.modal.getExternalContent(value);

            if (content) {
                var area = el.modal.getBody();
                area.innerHTML = '';
                area.appendChild(content);

                if (el.modal.get('useFrame')) {
                    area.addClassName('use-frame');
                } else {
                    area.removeClassName('use-frame');
                }
            }
        }
    },

    /**
     * Modal custom top offset renderer.
     * 
     * @param HTMLElement el    The modal element instance.
     * @param mixed       value The top offset value.
     * 
     * @return void
     */
    _settop: function(el, value) {
        el.modal.setDimension('top', value);
    },

    /**
     * Modal glass state renderer.
     * 
     * @param HTMLElement el    The modal element instance.
     * @param mixed       value The glass state flag.
     * 
     * @return void
     */
    _setuseGlass: function(el, value) {
        // Never use glass in tooltip mode
        if (el.modal.get('position') == 'tooltip' && value) {
            value = false;

            el.modal.set(true, 'useGlass', false);

            return;
        }

        if (value) {
            // Add glass if doesn't exist
            if (!el.hasClassName('modal-glass')) {
                var newEl = document.createElement('div');

                // Transfer attributes
                if (el.modal) {
                    newEl.modal = el.modal;
                } if (el.id) {
                    newEl.id = el.id;
                }

                // Preserve positional class names
                el.removeClassName('modal');
                newEl.className = 'modal-glass ' + el.className;

                if (el.hasClassName('open')) {
                    el.className = 'modal open';
                } else {
                    el.className = 'modal';
                }

                // Reset the class reference
                newEl.modal._el = newEl;

                if (document.body.contains(el)) {
                    document.body.removeChild(el);
                }
                
                newEl.appendChild(el);
                document.body.appendChild(newEl);
            }
        } else {
            // Remove glass if exists
            if (el.hasClassName('modal-glass')) {
                var newEl = el.down('.modal');

                // Transfer attributes
                if (el.modal) {
                    newEl.modal = el.modal;
                }

                if (el.id) {
                    newEl.id = el.id;
                }

                if (el.style.width) {
                    newEl.style.width = el.style.width;
                }

                if (el.style.height) {
                    newEl.style.height = el.style.height;
                }

                if (el.style.left) {
                    newEl.style.left = el.style.left;
                }

                if (el.style.top) {
                    newEl.style.top = el.style.top;
                }

                // Preserve positional class names
                el.removeClassName('modal-glass');
                newEl.addClassName(el.className);

                if (document.body.contains(el)) {
                    document.body.removeChild(el);
                    document.body.appendChild(newEl);
                }

                // Reset the class reference
                el.modal._el = newEl;
            }
        }
    },

    /**
     * Modal custom width renderer.
     * 
     * @param HTMLElement el    The modal element instance.
     * @param mixed       value The modal width value.
     * 
     * @return void
     */
    _setwidth: function(el, value) {
        el.modal.setDimension('width', value);
    },

    /**
     * Show the modal.
     * 
     * @return MageModal
     */
    _show: function() {
        this._el.style.display = 'block';

        if (this.get('useGlass')) {
            this._el.down('.modal').style.display = 'block';
        }

        // Delay allows CSS3 transitions
        setTimeout((function() {
            this._el.addClassName('open');

            if (this.get('useGlass')) {
                this._el.down('.modal').addClassName('open');
            }

            if (this.get('clickToggle')) {
                this.setClickToggle(true);
            }
        }).bind(this), 75);

        return this;
    },

    /**
     * Add a callback to the event registry.
     * 
     * @param string   event    The event name on which to listen.
     * @param function callback The callback function.
     * 
     * @return MageModal
     */
    addCallback: function(event, callback) {
        if (typeof callback == 'function') {
            if (typeof this._events[event] == 'undefined') {
                this._events[event] = [];
            }

            this._events[event].push(callback);
        }

        return this;        
    },

    /**
     * Align the modal with the bottom of the triggering element.
     * 
     * @return MageModal
     */
    alignToTrigger: function() {
        var target = this.get('trigger');

        if (target) {
            this._el.removeClassName('no-pointer');

            var targetPosition  = target.cumulativeOffset(),
                elDimensions    = this._el.getDimensions(),
                tipHeight       = 0;

            // Try to extract the tooltip arrow height from the stylesheet
            try {
                tipHeight = parseInt(getComputedStyle(this._el, ':before').getPropertyValue('line-height'), 10);

                if (isNaN(tipHeight)) {
                    throw $break;
                }
            } catch(error) {
                tipHeight = 16; // A suitable fallback
            }

            // Needs work :)
            var newPosition = [
                    Math.round( targetPosition.left + ( (target.getWidth() / 2) - (elDimensions.width / 2) ) ),
                    targetPosition.top + target.getHeight() + tipHeight + 2,
                    Math.round( targetPosition.left + ( (target.getWidth() / 2) - (elDimensions.width / 2) ) ) + elDimensions.width,
                    targetPosition.top + target.getHeight() + tipHeight + 2 + elDimensions.height
                ];

            // Check boundaries, re-calculate
            if (newPosition[2] > document.viewport.getWidth()) {
                newPosition[0] = document.viewport.getWidth() - elDimensions.width;
                this._el.addClassName('no-pointer');
            } else if (newPosition[0] < 0) {
                newPosition[0] = 0;
                this._el.addClassName('no-pointer');
            }

            if (newPosition[3] > document.viewport.getHeight()) {
                newPosition[1] = document.viewport.getHeight();
                this._el.addClassName('no-pointer');
            } else if (newPosition[1] < 0) {
                newPosition[1] = 0;
                this._el.addClassName('no-pointer');
            }

            if (this._el.hasClassName('no-pointer')) {
                newPosition[1] -= tipHeight;
            }

            this._el.style.left = newPosition[0].toString() + 'px';
            this._el.style.top  = newPosition[1].toString() + 'px';
        }

        return this;
    },

    /**
     * Bind modal controls to actions.
     * 
     * @return MageModal
     */
    bindControls: function() {
        try {
            Element.select(this._el, '[data-control]').each((function(el) {
                // Attribute value must match a class method
                el.observe('click', this[el.readAttribute('data-control')].bind(this));
            }).bind(this));
        } catch(error) { }

        return this;
    },

    /**
     * Close the modal.
     * 
     * @return MageModal
     */
    close: function() {
        this.dispatch('close');

        this._hide();
        this._isOpen = false;

        return this;
    },

    /**
     * Destroy the modal instance.
     * 
     * @return MageModal
     */
    destroy: function() {
        this._el.parentNode.removeChild(this._el);

        if ( (trigger = this.get('trigger')) ) {
            Element.stopObserving(trigger, 'click');
            Element.stopObserving(trigger, 'mouseover');
            Element.stopObserving(trigger, 'mouseout');

            trigger.writeAttribute('data-instance', false);
            trigger.modal = null;
        }

        delete this;

        //MageModal_Manager.refresh();
    },

    /**
     * Dispatch event notification to all listeners.
     * 
     * @return MageModal
     */
    dispatch: function() {
        if (typeof arguments[0] != 'string') {
            return this;
        }

        var event = arguments[0], args = Array.prototype.slice.call(arguments, 1);

        // Always include reference to self first
        args.unshift(this);

        if (typeof this._events[event] != 'undefined') {
            for(var i = 0; i < this._events[event].length; i++) {
                this._events[event][i].apply(this._events[event][i], args);
            }
        }

        return this;
    },

    /**
     * Focus input on the first control element.
     * 
     * @return MageModal
     */
    focus: function() {
        var controls = Element.select(this._el, '[data-control]');

        if (controls.length) {
            controls[0].focus();
        }

        return this;
    },

    /**
     * Create a modal element from a template.
     * 
     * @param string template The element template.
     * @param object options  Instance options.
     * 
     * @return HTMLElement
     */
    fromTemplate: function(template, options) {
        var container = document.createElement('div');

        container.style.display = 'none';
        container.update(template.strip());

        document.body.appendChild(container);

        var el = container.firstChild;

        if (!options.useGlass || options.position == 'tooltip') {
            el = el.down('.modal');
        }

        document.body.removeChild(container);

        return el;
    },

    /**
     * Option getter.
     * 
     * @param string key The option key.
     * 
     * @return mixed
     */
    get: function(key) {
        if (typeof this._options[key] != 'undefined') {
            return this._options[key];
        }

        return null;
    },

    /**
     * Get the modal content body.
     * 
     * @return HTMLElement
     */
    getBody: function() {
        return this._el.getElementsByTagName('section')[0];
    },

    /**
     * Get the default options.
     * 
     * @return object
     */
    getDefaults: function() {
        return {
            autoOpen        : true,
            bindKey         : null,
            content         : null,
            clickToggle     : true,
            destroyOnClose  : false,
            footer          : '<div class="controls a-right"><button data-control="close" class="button">Close</button></div>',
            header          : null,
            height          : null,
            id              : null,
            left            : null,
            position        : '',
            onClose         : null,
            onOpen          : null,
            onRenderAfter   : null,
            onRenderBefore  : null,
            onResize        : null,
            width           : null,
            showFooter      : true,
            showHeader      : true,
            source          : null,
            top             : null,
            useGlass        : true,
            useFrame        : false
        };
    },

    /**
     * Get the modal dialog.
     * 
     * @return HTMLElement
     */
    getDialog: function() {
        if (this.get('useGlass')) {
            return this._el.down('.modal');
        }

        return this._el;
    },

    /**
     * Fetch remote content.
     * 
     * @param string   source   The external URL.
     * @param object   data     Optional form data.
     * @param string   method   The form method (GET|POST).
     * @param function callback An option callback method.
     * 
     * @return HTMLElement
     */
    getExternalContent: function(source, data, method, callback) {
        this.getBody().addClassName('loading');

        data    = data || {};
        method  = method || 'GET';

        if (this.get('useFrame')) {
            content = document.createElement('iframe');

            content.onload = (function() {
                this.getBody().removeClassName('loading');
            }).bind(this);

            content.src = source;

            // No way to trigger resize
            // No way to stretch frame to fit max- boundaries
            // Force max-width/height through CSS hacks
        } else {
            //this._hide();
            content = document.createElement('div');

            // Hide footer until content is ready
            this.getFooter().hide();

            new Ajax.Request(source, {
                'method'    : method,
                parameters  : data, 
                onSuccess   : (function(transport) {
                    content.update(transport.responseText);

                    this.getBody().removeClassName('loading');

                    if (this.get('showFooter') && this.get('position') != 'tooltip') {
                        this.getFooter().show();
                    }

                    this.dispatch('content_loaded');

                    if (typeof callback == 'function') {
                        callback.apply(this);
                    }

                    //this._show();
                    this.resize();
                }).bind(this)
            });
        }

        content.writeAttribute('data-content', 'external');
        content.writeAttribute('data-source', source);

        return content;
    },

    /**
     * Get the modal footer.
     * 
     * @return HTMLElement
     */
    getFooter: function() {
        return this._el.getElementsByTagName('footer')[0];
    },

    /**
     * Get all custom dimensions.
     * 
     * @return object
     */
    getCustomDimensions: function() {
        if(
            !this.get('width') && 
            !this.get('height') &&
            !this.get('left') &&
            !this.get('top')
        )
            return false;

        return {
            width   : this.get('width'),
            height  : this.get('height'),
            left    : this.get('left'),
            top     : this.get('top')
        };
    },

    /**
     * Get the modal header.
     * 
     * @return HTMLElement
     */
    getHeader: function() {
        return this._el.getElementsByTagName('header')[0];
    },

    /**
     * Get the instance ID.
     * 
     * @return string
     */
    getId: function() {
        return this._id;
    },

    /**
     * Check if the positioning mode is fixed.
     * 
     * @return boolean
     */
    getIsFixedPosition: function() {
        return !(
            [
                'from-left',
                'from-right',
                'from-top',
                'from-bottom',
                'gallery'
            ].indexOf(this.get('position')) == -1
        );
    },

    /**
     * Check if the modal is open.
     * 
     * @return boolean
     */
    getIsOpen: function() {
        return this._el.hasClassName('open');
    },

    /**
     * Get the positioning mode match expression.
     * 
     * @return RegExp
     */
    getPositionRegExp: function() {
        return /from\-(left|right|top|bottom)|mid\-top|tooltip|gallery/g;
    },

    /**
     * Constructor.
     * 
     * @return void
     */
    initialize: function() {
        this._registerSetters();

        this._id        = this._getId();
        this._events    = {};
        this._options   = this.getDefaults();

        // Build from existing element
        if (arguments[0] instanceof HTMLElement) {
            this._el = Array.prototype.shift.call(arguments);
        }

        // Set bulk options
        if (typeof arguments[0] == 'object') {
            // Catch bad tooltip mode configurations
            if (arguments[0].position == 'tooltip') {
                arguments[0].useGlass = false;
            }

            this._set(arguments[0]);
        } else if (typeof arguments[0] == 'string') { // Set content if only argument is a string
            this._set({ content : arguments[0] });
        }
        
        // Build new from template
        if (!this._el) {
            this._el = this.fromTemplate(this._template, this._options);
        }

        this._prepareEvents();
        this._prepareElement();
        this._prepareInput();

        this.dispatch('initialize');

        this.open();
    },

    /**
     * Adds a close event handler.
     * 
     * @param function callback A callback function.
     * 
     * @return MageModal
     */
    onClose: function(callback) {
        this.addCallback('close', callback);

        return this;
    },

    /**
     * Adds an open event handler.
     * 
     * @param function callback A callback function.
     * 
     * @return MageModal
     */
    onOpen: function(callback) {
        this.addCallback('open', callback);

        if (this.getIsOpen()) {
            callback.call(callback, this);
        }

        return this;
    },

    /**
     * Adds a post-render event handler.
     * 
     * @param function callback A callback function.
     * 
     * @return MageModal
     */
    onRenderAfter: function(callback) {
        this.addCallback('render_after', callback);

        return this;
    },

    /**
     * Adds a pre-render event handler.
     * 
     * @param function callback A callback function.
     * 
     * @return MageModal
     */
    onRenderBefore: function(callback) {
        this.addCallback('render_before', callback);

        return this;
    },

    /**
     * Adds a resize event handler.
     * 
     * @param function callback A callback function.
     * 
     * @return MageModal
     */
    onResize: function(callback) {
        this.addCallback('resize', callback);

        return this;
    },

    /**
     * Open the modal.
     * 
     * @param object  options  Instance options to set on open.
     * @param boolean noRender An optional flag to skip rendering.
     * 
     * @return
     */
    open: function(options, noRender) {
        // Set options just-in-time
        if (options) {
            this.set(true, options);
        }

        // Don't open on first call if not using autoOpen
        if (!this._openFlag && !this.get('autoOpen')) {
            this._openFlag = true;

            return this;
        }

        this.dispatch('open', options);

        this._show();

        this._openFlag  = true;
        this._isOpen    = true;

        if (!noRender) {
            this.render();
        }
        
        this.focus();

        return this;
    },

    /**
     * Render the modal.
     * 
     * @return MageModal
     */
    render: function() {
        this.unbindControls();

        this.dispatch('render_before');

        var options = this._getRenderOptions(), option;

        for (var i = 0; i < options.length; i++) {
            option = options[i];

            if (typeof this._setters[option.key] == 'function') {
                this._setters[option.key].call(this._setters[option.key], this._el, option.value);
            }
        }

        this.dispatch('render_after');

        this.bindControls();

        this.resize();

        return this;
    },

    /**
     * Reset custom dimensions on the modal.
     * 
     * @return MageModal
     */
    resetCustomDimensions: function() {
        this.set(true, {
            left    : null,
            top     : null,
            width   : null,
            height  : null
        });

        this.getDialog().removeClassName('custom-dimensions');

        return this;
    },

    /**
     * Reset the modal position.
     * 
     * @param boolean resetOptions An optional flag to reset custom dimensions.
     * 
     * @return MageModal
     */
    resetPosition: function(resetOptions) {
        var dialog = this.getDialog();

        if (dialog) {
            // Strip positioning tags
            dialog.className = dialog.className
                .replace(this.getPositionRegExp(), '')
                .replace(/\s{2}/g, ' ')
                .trim();

            // Reset will cause modal to fall back to CSS rules
            dialog.style.top            = '';
            dialog.style.left           = '';
            dialog.style.width          = '';
            dialog.style.height         = '';
            this.getBody().style.height = '';

            if (resetOptions) {
                this.resetCustomDimensions();
            }
        }

        return this;
    },

    /**
     * Resize modal components.
     * 
     * @return MageModal
     */
    resize: function() {
        if (!this._isOpen) {
            return false;
        }

        // In tooltip mode, resize operation is a placement
        if (this.get('position') == 'tooltip') {
            return this.alignToTrigger();
        }

        var target = this._el;

        if (this.get('useGlass')) {
            this._el.style.lineHeight = document.viewport.getHeight().toString() + 'px';

            target = this._el.down('.modal');
        }

        if (target) {
            // Resize content first to get new offsets
            this.resizeContent();

            // Re-position top when positioning is non-vertical and no custom dimension is specified
            if (['from-top', 'from-bottom'].indexOf(this.get('position')) == -1 && !this.getCustomDimensions().top) {
                target.style.top = new String(Math.round( (document.viewport.getHeight() / 2) - (target.getHeight() / 2)) ) + 'px';
            }

            // Re-position left when positioning is non-horizontal and no custom dimension is specified
            if (['from-left', 'from-right'].indexOf(this.get('position')) == -1 && !this.getCustomDimensions().left) {
                target.style.left = new String(Math.round( (document.viewport.getWidth() / 2) - (target.getWidth() / 2)) ) + 'px';
            }

        }

        this.dispatch('resize');

        return this;
    },

    /**
     * Resize the modal content.
     * 
     * @return MageModal
     */
    resizeContent: function() {
        // Reset height to re-calculate
        this.getBody().style.height = '';

        var headerHeight = this.getHeader().visible() ? this.getHeader().getHeight() : 0,
            footerHeight = this.getFooter().visible() ? this.getFooter().getHeight() : 0;

        this.getBody().style.height = (this.getDialog().getHeight() - headerHeight-footerHeight).toString() + 'px';

        return this;
    },

    /**
     * Option setter.
     *
     * @param boolean|string|object The option(s) to set.
     * @param mixed                 Optional value(s) to set.
     * 
     * @return MageModal
     */
    set: function() {
        var noRender = typeof arguments[0] == 'boolean' ? Array.prototype.shift.call(arguments) : false;

        if (typeof arguments[0] == 'object') {
            for (var key in arguments[0]) {
                this.dispatch('option_change', key, this._options[key], arguments[0][key]);

                this._options[key] = arguments[0][key];
            }
        } else {
            this.dispatch('option_change', arguments[0], this._options[arguments[0]], arguments[1]);

            this._options[arguments[0]] = arguments[1];
        }

        if (!noRender) {
            this.render();
        }

        return this;
    },

    /**
     * Toggle the click-to-close state of the modal.
     * 
     * @param boolean state The click toggle flag state.
     * 
     * @return void
     */
    setClickToggle: function(state) {
        if (state && !this.get('clickEvent') && this.getIsOpen()) {
            // Listen for clicks to close the modal
            var clickHandler = ((function(event) {
                if (this.getIsOpen()) {
                    var element = Event.element(event);

                    while (element && element.tagName.toLowerCase() != 'body') {
                        if (element.hasClassName('modal')) {
                            return;
                        }

                        element = element.up();
                    }

                    this.close();
                }
            }).bind(this));

            Event.observe(document.body, 'click', clickHandler);

            this.set(true, 'clickEvent', clickHandler);
        } else if (!state && this.get('clickEvent')) {
            Event.stopObserving(document.body, 'click', this.get('clickEvent'));

            this.set(true, 'clickEvent', null);
        }
    },

    /**
     * Set a modal dimension.
     * 
     * @param string dimension The dimension to set.
     * @param mixed  value     The dimension value.
     * 
     * @return MageModal
     */
    setDimension: function(dimension, value) {
        // Convert non-percent values to pixels
        if (
            typeof value == 'string' && 
            value.indexOf('%') == -1 && 
            value.indexOf('px') == -1 && 
            !isNaN(parseInt(value, 10))
        )
        {
            value = value.toString() + 'px';
        }

        var dialog = this.getDialog();

        if (value) {
            dialog.addClassName('custom-dimensions');

            dialog.style[dimension] = value;
        }
        // Leaves class on modal; will be removed
        // if position option is set
        
        return this;
    },

    /**
     * Set the instance ID.
     * 
     * @param string ID The instance iD.
     *
     * @return MageModal
     */
    setId: function(id) {
        // Update all triggers
        Element.select(document.body, '[data-instance="' + id + '"]').each(function(el) {
            el.writeAttribute('data-instance', id);
        });

        this._id    = id;
        this._el.id = id;

        return this;
    },

    /**
     * Toggle the modal visibility.
     * 
     * @return MageModal
     */
    toggle: function() {
        if (this.getIsOpen()) {
            this.close.apply(this, arguments);
        } else {
            this.open.apply(this, arguments);
        }

        return this;
    },

    /**
     * Remove modal control bindings.
     * 
     * @return MageModal
     */
    unbindControls: function() {
        Element.select(this._el, '[data-control]').each(function(el) {
            el.stopObserving('click');
        });

        return this;
    }

};

/**
 * Modal management helper class. Used for auto-initializing static modals.
 * 
 * @type object
 */
var MageModal_Manager = {

    _attributePrefix    : 'data-',
    _listeners          : [
        function() {
            Element.select(document.body, '[data-toggle="modal"]').each((function(el) {
                var options = this.getOptions(el);

                // Auto-initialize instance
                if (!this.getInstance(el)) {
                    this.createInstance(el);
                } else {
                    return false;
                }

                // Toggle modal on hover
                if (options.hover) {
                    el.observe('mouseover', this.open.bind(this, el));
                    el.observe('mouseout', this.open.bind(this, el));
                }

                // Always toggle modal on click
                el.observe('click', this.open.bind(this, el));
            }).bind(this));
        }
    ],
    _triggers           : [],

    /**
     * Map an element attribute name to its modal option name.
     * 
     * @param string attribute The element attribute name (eg: data-id).
     * 
     * @return string|boolean
     */
    _getOptionKey: function(attribute) {
        if (attribute.indexOf(this._attributePrefix) == 0) {
            return attribute.substr(this._attributePrefix.length).replace(/\-[a-zA-Z0-9]/g, function(match) {
                return match.substr(1).toUpperCase();
            });
        }

        return false;
    },

    /**
     * Extract a modal position from a class(es).
     * 
     * @param string className The CSS class.
     * 
     * @return string|null
     */
    _getPosition: function(className) {
        var match = className.match(MageModal.prototype.getPositionRegExp());

        if (match) {
            return match[0];
        }

        return null;
    },


    /**
     * Add an attribute trigger callback.
     * 
     * @param function callback A callback function.
     * 
     * @return MageModal_Manager
     */
    addListener: function(callback) {
        if (typeof callback == 'function') {
            this._listeners.push(callback);
        }

        return this;
    },

    /**
     * Bind trigger elements to open a modal.
     * 
     * @return MageModal_Manager
     */
    bindListeners: function() {
        for (var i = 0; i < this._listeners.length; i++) {
            this._listeners[i].apply(this);
        }

        return this;
    },

    /**
     * Bind static modals on the page to a modal instance.
     * 
     * @return MageModal_Manager
     */
    bindStaticWindows: function() {
        Element.select(document.body, '.modal').each((function(el) {
            var parent  = el.up('.modal-glass'), 
                options = {
                    autoOpen: false,
                    position: this._getPosition(el.className)
                };

            if (parent) {
                el                  = parent;
                options.useGlass    = true;
            } else {
                options.useGlass    = false;
            }

            // Inherit static options from modal
            options = Object.extend(this.getOptions(el), options);

            // Do not initialize if modal instance is already attached
            if (el.modal) {
                return;
            }

            // Preserve header, footer, content
            options.footer  = null;
            options.header  = null;
            options.content = null;

            // Move all instances to be children of body
            if (!el.up('body', 1)) {
                el.parentNode.removeChild(el);
                document.body.appendChild(el);
            }

            new MageModal(el, options);
        }).bind(this));

        return this;
    },

    /**
     * Create a new modal instance.
     * 
     * @param HTMLElement source The source element (static modal).
     * 
     * @return MageModal_Manager
     */
    createInstance: function(source, options) {
        var options             = Object.extend(this.getOptions(source), options || {});
            options.autoOpen    = false;
            options.trigger     = source;

        var modal = new MageModal(options);

        source.writeAttribute('data-instance', modal.getId());
        source.modal = modal;

        this._triggers.push(source);

        return this;
    },

    /**
     * Get the default modal options.
     * 
     * @return object
     */
    getDefaults: function() {
        return MageModal.prototype.getDefaults();
    },

    /**
     * Get the modal instance object from the source element.
     * 
     * @param HTMLElement source The target element.
     * 
     * @return MageModal|false
     */
    getInstance: function(source) {
        var id = source.readAttribute('data-instance');

        if (id && $(id) && $(id).modal) {
            return $(id).modal;
        }

        return false;
    },

    /**
     * Get modal options from an element.
     * 
     * @param HTMLElement source The modal element.
     * 
     * @return object
     */
    getOptions: function(source) {
        var options = {}, name, value;

        // Extract 'data-' attributes and map to option hash
        $A(source.attributes).each((function(attribute) {
            name = this._getOptionKey(attribute.name);

            if (name) {
                value = attribute.nodeValue;

                // Cast booleans
                if (value == 'false' || value == 'true') {
                    value = value == 'false' ? false : true;
                }

                options[name] = value;
            }
        }).bind(this));

        options = Object.extend(this.getDefaults(), options);

        return options;
    },

    /**
     * Get the trigger element collection.
     * 
     * @return array
     */
    getTriggers: function() {
        return this._triggers;
    },

    /**
     * Open the modal instance.
     * 
     * @param HTMLElement source The target modal element instance.
     * @param object options     Options to pass to modal on opening.
     * 
     * @return MageModal_Manager
     */
    open: function(source, options) {
        if (this.getInstance(source)) {
            this.getInstance(source).toggle(options);
        }

        return this;
    },

    /**
     * Scan for triggers and static modals.
     * 
     * @return MageModal_Manager
     */
    refresh: function() {
        this.unbind();

        this.bindStaticWindows();
        this.bindListeners();

        return this;
    },

    /**
     * Stop tracking trigger element clicks.
     * 
     * @param string id
     * @return MageModal_Manager
     */
    unbind: function(id) {
        for (var i = 0; i < this._triggers; i++) {
            if (!id || id == this._triggers[i].modal.getId()) {
                this._triggers[i].stopObserving('click');
            }
        }

        if (!id) {
            this._triggers = [];
        }

        return this;
    }

};

/**
 * Modal gallery extension.
 * 
 * @type object
 */
var MageModal_Gallery = Class.create();
MageModal_Gallery.prototype = {

    _activeItem     : null,
    _container      : null,
    _controlBinder  : function(event) {
        if (this._modal.getIsOpen()) {
            switch(event.keyCode) {
                case 37 :
                    var control = Element.select(this._modal.getBody(), '.gallery-control.previous')[0];

                    control.addClassName('active');

                    setTimeout(function() {
                        control.removeClassName('active');
                    }, 500);

                    this.navigate('previous');

                    event.stopPropagation();
                    event.preventDefault();

                    break;
                case 39 :
                    var control = Element.select(this._modal.getBody(), '.gallery-control.next')[0];

                    control.addClassName('active');

                    setTimeout(function() {
                        control.removeClassName('active');
                    },500);

                    this.navigate('next');

                    event.stopPropagation();
                    event.preventDefault();

                    break;
                case 32 :
                    this.toggleMedia();

                    event.stopPropagation();
                    event.preventDefault();

                    break;
                default:
                    break;
            }
        }
    },
    _media          : [],
    _modal          : null,

    /**
     * Backend media queue.
     *
     * @return MageModal_Gallery
     */
    _addMedia: function() {
        var media   = this._media;
        this._media = [];

        for (var i = 0; i < media.length; i++) {
            this.addMedia(media[i]);
        }

        return this;
    },

    /**
     * Bind keyboard navigation to the modal.
     * 
     * @return MageModal_Gallery
     */
    _bindControls: function() {
        this._controlBinder = this._controlBinder.bind(this);

        if (this.getIsGalleryMode()) {
            Event.observe(window, 'keydown', this._controlBinder);
        }

        return this;
    },

    /**
     * Attach video elements to the modal.
     * 
     * @param object media The media element.
     * 
     * @return MageModal_Gallery
     */
    _bindVideoEvents: function(media) {
        media.load = ((function(gallery) {
            if (!this.isLoaded) {
                var source = this.readAttribute('data-source');

                if (source) {
                    gallery.setMediaState(this,1);
                    if (typeof source == 'string') {
                        this.src = source;
                    } else {
                        var sourceEl;

                        for (var i = 0; i < source.length; i++) {
                            sourceEl        = document.createElement('source');
                            sourceEl.src    = source[i].src;
                            sourceEl.type   = source[i].type;
                        }
                    }
                }
            }
        }).bind(media, this));

        media.observe('canplaythrough', (function(gallery) {
            gallery.setMediaState(this, 2);
        }).bind(media, this));

        return this;
    },

    /**
     * Create a media container element.
     * 
     * @param string type    The media type.
     * @param string caption An optional caption for the media.
     * 
     * @return HTMLElement
     */
    _getMediaContainer: function(type,caption) {
        var container = document.createElement('figure');
        container.className = 'media';

        if (type) {
            container.className += ' type-' + type;
        }

        if (caption) {
            var captionEl       = document.createElement('figcaption');
            captionEl.className = 'caption';

            captionEl.update(caption);

            container.appendChild(captionEl);
        }

        switch (type) {
            case 'video' :
                container.appendChild(this._getMediaVideoControls());

                break;
            case 'image' :
            default :
                break;
        }

        return container;
    },

    /**
     * Media image object factory method.
     * 
     * @param string source The image source.
     * 
     * @return HTMLImageElement
     */
    _getMediaImage: function(source) {
        var media = document.createElement('img');

        media.writeAttribute('data-source', source);
        media.writeAttribute('data-state', 0);
        media.writeAttribute('data-type', 'image');

        media.load = ((function(gallery) {
            if (!this.isLoaded) {
                var source = this.readAttribute('data-source');

                if (source) {
                    this.onload = gallery.setMediaState.bind(gallery, this, 2);

                    gallery.setMediaState(media, 1);

                    this.src = source;
                }
            }
        }).bind(media, this));
        
        return media;
    },

    /**
     * Media video object factory method.
     * 
     * @param string source The video source.
     * 
     * @return HTMLVideoElement
     */
    _getMediaVideo: function(source) {
        if (this.getIsYouTubeLink(source)) {
            return this._getMediaVideoYouTube(source);
        } else if (this.getIsVimeoLink(source)) {
            return this._getMediaVideoVimeo(source);
        }

        var media = document.createElement('video');

        media.controls  = false;
        media.autoplay  = false;
        media.stop      = media.pause;

        media.writeAttribute('data-source', source);
        media.writeAttribute('data-state', 0);
        media.writeAttribute('data-type', 'video');

        this._bindVideoEvents(media);

        return media;
    },

    /**
     * Get the video controls element group.
     *
     * @todo Control suite elements
     * 
     * @return HTMLElement
     */
    _getMediaVideoControls: function() {
        var controls    = document.createElement('div'),
            toggle      = document.createElement('a');

        controls.className  = 'video-controls';
        toggle.className    = 'video-control toggle';

        toggle.observe('click', this.toggleMedia.bind(this));

        controls.appendChild(toggle);

        return controls;
    },

    /**
     * Get the Videmo video media element.
     * 
     * @param string source The video source.
     * 
     * @return HTMLIFrameElement
     */
    _getMediaVideoVimeo: function(source) {
        var media = document.createElement('iframe');

        media.id                = this._modal._getId('vimeo_');
        media.allowfullscreen   = true;
        media.frameborder       = '0';
        media.writeAttribute('data-source', this.getVimeoEmbedLink(source, media.id));
        media.writeAttribute('data-state', 0);
        media.writeAttribute('data-type', 'vimeo');
        media.writeAttribute('data-ratio', (500 / 281)); // Standard Vimeo viewport

        media.load = ((function(gallery) {
            if (!this.src) {
                var source = this.readAttribute('data-source');

                if (source) {
                    gallery.setMediaState(this, 1);

                    this.src = source;
                }
            }
        }).bind(media, this));

        media.onload = ((function(gallery) {
            gallery.setMediaState(this, 2);
            gallery.getModal().resize();
        }).bind(media, this));

        // See http://developer.vimeo.com/player/js-api
        media.stop = ((function(gallery) {
            this.contentWindow.postMessage(JSON.stringify({ method : 'pause' }), '*');
        }).bind(media, this));

        media.play = ((function(gallery) {
            this.contentWindow.postMessage(JSON.stringify({ method : 'play' }), '*');
        }).bind(media, this));

        this._modal.onResize((function(gallery) {
            var ratio = parseFloat(this.readAttribute('data-ratio'));

            this.style.width    = Math.round(gallery.getModal().getBody().getHeight() * ratio).toString() + 'px';
            this.style.height   = '100%';
        }).bind(media, this));

        return media;
    },

    /**
     * Get the YouTube video element.
     * 
     * @param string source The YouTube video source.
     * 
     * @return HTMLIFrameElement
     */
    _getMediaVideoYouTube: function(source) {
        var media = document.createElement('iframe');

        media.id                = this._modal._getId('youtube_');
        media.allowfullscreen   = true;
        media.frameborder       = '0';
        media.writeAttribute('data-source', this.getYouTubeEmbedLink(source));
        media.writeAttribute('data-state',0);
        media.writeAttribute('data-type', 'youtube');
        media.writeAttribute('data-ratio', (560 / 315)); // Standard YouTube medium viewport

        media.load = ((function(gallery) {
            if (!this.src) {
                var source = this.readAttribute('data-source');

                if (source) {
                    gallery.setMediaState(this, 1);

                    this.src = source;
                }
            }
        }).bind(media, this));

        media.onload = ((function(gallery) {
            gallery.setMediaState(this, 2);
            gallery.getModal().resize();
        }).bind(media, this));

        media.stop = ((function(gallery) {
            this.contentWindow.postMessage(JSON.stringify({
                event   : 'command',
                func    : 'pauseVideo',
                args    : ''
            }), '*');
        }).bind(media, this));

        media.play = ((function(gallery) {
            this.contentWindow.postMessage(JSON.stringify({
                event   : 'command',
                func    : 'playVideo',
                args    : ''
            }), '*');
        }).bind(media, this));

        this._modal.onResize((function(gallery) {
            var ratio = parseFloat(this.readAttribute('data-ratio'));

            this.style.width    = Math.round(gallery.getModal().getBody().getHeight() * ratio).toString() + 'px';
            this.style.height   = '100%';
        }).bind(media, this));

        return media;
    },

    /**
     * Extract media from static modals where content is already set.
     * 
     * @return MageModal_Gallery
     */
    _getStaticMedia: function() {
        return $A(this._modal.getBody().childNodes).collect((function(item) {
            return this.getMediaByType(item);
        }).bind(this)).filter(Object.isElement);
    },

    /**
     * Hide the navigation controls.
     * 
     * @return MageModal_Gallery
     */
    _hideControls: function() {
        this._modal.getDialog().addClassName('no-controls');

        return this;
    },

    /**
     * Backend gallery reset method.
     * 
     * @return MageModal_Gallery
     */
    _load: function() {
        this._container.innerHTML   = '';
        this._activeItem            = null;

        this.render();

        return this;
    },

    /**
     * Add gallery controls to the modal.
     * 
     * @return MageModal
     */
    _prepareGallery: function() {
        // Acquire static media before clearing the content
        this._media = this._media.concat(this._getStaticMedia());

        var area        = this._modal.getBody();
        area.innerHTML  = '';

        var controlPrevious = document.createElement('a'),
            controlNext     = document.createElement('a');

        controlPrevious.className   = 'gallery-control previous';
        controlNext.className       = 'gallery-control next';

        area.appendChild(controlPrevious);
        area.appendChild(controlNext);

        Event.observe(controlPrevious, 'click', this.navigate.bind(this, 'previous'));
        Event.observe(controlNext, 'click', this.navigate.bind(this, 'next'));

        var controlPager = document.createElement('div');

        controlPager.className = 'gallery-pager';

        area.appendChild(controlPager);

        var inner = document.createElement('div');

        inner.className = 'gallery-inner';

        area.appendChild(inner);

        this._container = inner;

        this._load();

        return this;
    },

    /**
     * Gallery position trigger.
     * 
     * @param MageModal modal   The modal instance.
     * @param object    options The modal options.
     *
     * @return MageModal_Gallery
     */
    _setIndex: function(modal,options) {
        if (modal.gallery.getIsGalleryMode()) {
            var index = 0;

            if (options && typeof options.galleryIndex == 'number') {
                index = options.galleryIndex;
            }

            modal.gallery.navigate(index);
        }

        return this;
    },

    /**
     * Set the current gallery image.
     * 
     * @param HTMLElement item The gallery item element.
     *
     * @return MageModal_Gallery
     */
    _setItem: function(item) {
        var offset      = 0, 
            activeIndex = this.getActiveIndex(), 
            itemIndex   = this.getItemIndex(item);

        if (!this.getIsActive(item)) {
            offset = activeIndex - itemIndex;
        }

        if (offset) {
            var width = 100 / this._media.length, curItemIndex;

            this._media.each((function(item) {
                curItemIndex = this.getItemIndex(item);

                if (curItemIndex != itemIndex && curItemIndex != activeIndex) {
                    item.style.visibility = 'hidden';
                } else {
                    item.style.visibility = 'visible';
                }

                item.style.left =- (width * itemIndex).toString() + '%';
            }).bind(this));
        }

        this._activeItem = item;
        item.load();

        return this;
    },

    /**
     * Show the navigation controls.
     * 
     * @return MageModal_Gallery
     */
    _showControls: function() {
        this._modal.getDialog().removeClassName('no-controls');

        return this;
    },

    /**
     * Remove keyboard navigation bindings.
     * 
     * @return MageModal_Gallery
     */
    _unbindControls: function() {
        if (this.getIsGalleryMode()) {
            Event.stopObserving(window, 'keydown', this._controlBinder);
        }

        return this;
    },

    /**
     * Add media to the gallery.
     *
     * @todo Future support for video media types.
     * 
     * @param string source  The source value.
     * @param string caption The caption.
     *
     * @return void
     */
    addMedia: function(source, caption) {
        var media, type;

        if (source instanceof HTMLElement) {
            media = source;

            this._container.appendChild(source);
        } else {
            type    = this.getMediaType(source);
            media   = this.getMediaByType(type, source, caption);

            this._container.appendChild(media);
        }

        this._media.push(media);
        media.writeAttribute('data-index', (this._media.length - 1));

        this._modal.getDialog().removeClassName('no-media');

        if (this._media.length < 2) {
            this._hideControls();
        } else {
            this._showControls();
        }

        this.navigate(this._media.length - 1);

        this.resize();
    },

    /**
     * Close the gallery.
     * 
     * @return MageModal_Gallery
     */
    close: function() {
        this._modal.close();

        return this;
    },

    /**
     * Initialize the modal as a gallery.
     * 
     * @param MageModal modal The modal instance.
     *  
     * @return void
     */
    initialize: function(modal) {
        this._media = [];

        // Create referential relationships
        this._modal         = modal;
        this._modal.gallery = this;

        this._prepareGallery();

        this._modal.onResize(this.resize.bind(this));
        this._modal.onOpen(this._setIndex.bind(this));
        this._modal.onOpen(this._bindControls.bind(this));
        this._modal.onClose(this._unbindControls.bind(this));
        this._modal.onClose(this.stopMedia.bind(this));
    },

    /**
     * Get the gallery container element.
     * 
     * @return HTMLElement
     */
    getContainer: function() {
        return this._container;
    },

    /**
     * Check if the modal mode is set to gallery.
     * 
     * @return boolean
     */
    getIsGalleryMode: function() {
        return this._modal.get('position') == 'gallery';
    },

    /**
     * Get the active media item.
     * 
     * @return HTMLElement
     */
    getActiveItem: function() {
        return this._activeItem;
    },

    /**
     * Get the active item type.
     * 
     * @return string|false
     */
    getActiveItemType: function() {
        if (this._activeItem) {
            return this.getActiveObject().readAttribute('data-type');
        }

        return false;
    },

    /**
     * Get the active media item index.
     * 
     * @return number
     */
    getActiveIndex: function() {
        if (this._activeItem) {
            return parseInt(this._activeItem.readAttribute('data-index'), 10);
        }

        return 0;
    },

    /**
     * Get the active gallery object.
     * 
     * @return HTMLElement|false
     */
    getActiveObject: function() {
        if (this._activeItem) {
            var object = this._activeItem.select('.object');

            if (object.length) {
                return object[0];
            }
        }

        return false;
    },

    /**
     * Check if the given item is the active item.
     * 
     * @param HTMLElement item The gallery item element.
     * 
     * @return boolean
     */
    getIsActive: function(item) {
        return this._activeItem === item || this._activeItem === item.up('.media');
    },

    /**
     * Determine whether the source is a YouTube link.
     * 
     * @param string source A URL.
     * 
     * @return boolean
     */
    getIsYouTubeLink: function(source) {
        return source.match(/(youtu(\.)*be(\-nocookie)*(\.com)*)/) !== null;
    },

    /**
     * Determine whether the source is a Vimeo link.
     * 
     * @param string source A URL.
     * 
     * @return boolean
     */
    getIsVimeoLink: function(source) {
        return source.indexOf('vimeo.com') !== -1;
    },

    /**
     * Get a media item by index.
     * 
     * @param number index The index.
     * 
     * @return HTMLElement
     */
    getItem: function(index) {
        if (typeof this._media[index] != 'undefined') {
            return this._media[index];
        }

        return false;
    },

    /**
     * Get the index of the given media item.
     * 
     * @param HTMLElement item The gallery item element.
     * 
     * @return number
     */
    getItemIndex: function(item) {
        return parseInt(item.readAttribute('data-index'), 10);

        return 0;
    },

    /**
     * Get the rendered media items collection.
     * 
     * @return array
     */
    getItems: function() {
        return $A(this._container.getElementsByTagName('figure'));
    },

    /**
     * Create a new media object from the given parameters.
     * 
     * @param object|string type    The media type.
     * @param string        source  The media source.
     * @param string        caption The media caption.
     * 
     * @return HTMLElement
     */
    getMediaByType: function(type, source, caption) {
        var container, media, typeMap = {
            HTMLImageElement: {
                type    : 'image',
                source  : 'src',
                caption : 'title'
            },
            HTMLVideoElement: {
                type    : 'video',
                source  : 'src',
                caption : 'title'
            },
            HTMLIFrameElement: {
                type    : 'video',
                source  : 'src',
                caption : 'title'
            }
        };

        // Accept media elements
        if (typeof type == 'object') {
            var element = type;

            if ( !(map = typeMap[element.constructor.name]) ) {
                return false;
            }

            type    = map.type;
            source  = element[map.source];
            caption = element[map.caption];
        }

        switch(type) {
            case 'video' :
                media = this._getMediaVideo(source);

                break;
            case 'image' :
                media = this._getMediaImage(source);

                break;
            default:
                return false;
        }

        media.className = 'object';

        var objectType  = media.readAttribute('data-type');
        container       = this._getMediaContainer(objectType, caption);

        container.appendChild(media);

        // Reference load handler in container
        container.load = media.load;

        return container;
    },

    /**
     * Get the media type from the given source.
     * 
     * @param string source The source URL.
     * 
     * @return string
     */
    getMediaType: function(source) {
        // Only videos can contain a source array
        if (source instanceof Array) {
            return 'video';
        }

        if (this.getIsYouTubeLink(source) || this.getIsVimeoLink(source)) {
            return 'video';
        }

        switch (source.split('.').pop().toLowerCase()) {
            case 'webm' :
            case 'ogg'  :
            case 'mp4'  :
            case 'mp3'  :
            case 'wav'  :
            case 'flac' :
                return 'video';
            default :
                return 'image';
        }
    },

    /**
     * Get the modal instance.
     * 
     * @return MageModal
     */
    getModal: function() {
        return this._modal;
    },

    /**
     * Get the Vimeo media URL.
     * 
     * @param string source   The video source.
     * @param string playerId A player ID string.
     * 
     * @return string
     */
    getVimeoEmbedLink: function(source,playerId) {
        // Return if already a proper link
        if (source.match(/player\.vimeo\.com\/video/)) {
            return source.split('?')[0] + '?api=1&player_id=' + playerId;
        }

        // URL must contain be from Vimeo
        if (!source.match(/vimeo\.com/)) {
            return false;
        }

        // Strip protocol
        source = source.replace(/(http(s)*:)*\/\//);

        // Extract ID from URL
        var id = source.split('/').pop().replace(/[\?#].*$/, '');

        return '//' + 'player.vimeo.com/video/' + id + '?api=1&player_id=' + playerId;
    },

    /**
     * Get the YouTube media URL.
     * 
     * @param string source   The video source.
     * 
     * @return string
     */
    getYouTubeEmbedLink: function(source) {
        // Return if already a proper link
        if (source.match(/youtube(\-nocookie)*\.com\/(embed|v)/)) {
            return source.split('?')[0] + '?enablejsapi=1';
        }

        // URL must contain .be domain, /v in path, or /watch in path
        if (!source.match(/\.be\/|\/v|\/watch/)) {
            return false;
        }

        // Strip protocol
        source = source.replace(/(http(s)*:)*\/\//);

        var id;
        // Extract ID from traditional URLs
        if (source.indexOf('/watch') != -1) {
            id = source.split('v=').pop().replace(/&.*$/, '');
        } else if (source.indexOf('.be/') != -1) { // Else extract from .be URLs
            id = source.split('/').pop().split('?')[0];
        } else {
            return false;
        }

        return '//' + 'www.youtube.com/embed/' + id + '?enablejsapi=1';
    },

    /**
     * Navigate the gallery.
     * 
     * @param string|number index The gallery index.
     * 
     * @return MageModal_Gallery
     */
    navigate: function(index) {
        if (typeof index == 'string') {
            switch (index) {
                case 'previous' :
                    index = this.getActiveIndex() - 1;

                    if (index < 0) {
                        index = this._media.length - 1;
                    }

                    break;
                case 'next' :
                    index = this.getActiveIndex() + 1;

                    if (index > (this._media.length - 1)) {
                        index = 0;
                    }

                    break;
                default :
                    index = 0;

                    break;
            }
        }

        if (this._media[index]) {
            this.stopMedia();

            this._setItem(this._media[index]);
            Element.select(
                this._modal.getBody(), 
                '.gallery-pager'
            )[0].update( (this.getActiveIndex() + 1).toString() + '/' + this._media.length.toString() );
        }

        return this;
    },

    /**
     * Open the gallery.
     * 
     * @param object options The options object.
     * 
     * @return MageModal_Gallery
     */
    open: function(options) {
        this._modal.open(options);

        return this;
    },

    /**
     * Play the active media.
     * 
     * @return MageModal_Gallery
     */
    playMedia: function() {
        if (this.getActiveObject().play) {
            this.getActiveObject().play();
        }

        this._modal.getDialog().addClassName('state-play');

        return this;
    },

    /**
     * Render the gallery.
     * 
     * @return MageModal_Gallery
     */
    render: function() {
        this._container.innerHTML   = '';
        this._container.style.width = '';

        if (this._media.length < 2) {
            this._modal.getDialog().addClassName('no-media');
            this._hideControls();
        } else {
            this._modal.getDialog().removeClassName('no-media');
            this._showControls();

            this._addMedia();
        }

        return this;
    },

    /**
     * Front-end gallery reset method.
     * 
     * @return MageModal_Gallery
     */
    reset: function() {
        this._load();

        return this;
    },

    /**
     * Resize all gallery media.
     * 
     * @return MageModal_Gallery
     */
    resize: function() {
        if (this.getIsGalleryMode()) {
            this._container.style.width = (this._media.length * 100).toString() + '%';

            this.getItems().each((function(item) {
                item.style.lineHeight   = this._container.getHeight().toString() + 'px';
                item.style.width        = (100/this._media.length).toString() + '%';
            }).bind(this));
        }

        return this;
    },

    /**
     * Set the media ready state.
     * 
     * @param HTMLElement media The media element.
     * @param number      state The ready state.
     * 
     * @return MageModal_Gallery
     */
    setMediaState: function(media, state) {
        switch (state) {
            case 2 :
                this._modal.getBody().removeClassName('loading');

                media.isLoaded = true;

                break;
            case 1 :
                this._modal.getBody().addClassName('loading');

                media.isLoaded = false;

                break;
            case 0 :
            default :
                break;
        }

        return this;
    },

    /**
     * Stop the active media.
     * 
     * @return MageModal_Gallery
     */
    stopMedia: function() {
        if (this.getActiveObject().stop) {
            this.getActiveObject().stop();
        }

        this._modal.getDialog().removeClassName('state-play');
        
        return this;
    },

    /**
     * Toggle the active media.
     * 
     * @return MageModal_Gallery
     */
    toggleMedia: function() {
        if (this._modal.getDialog().hasClassName('state-play')) {
            this.stopMedia();
        } else {
            this.playMedia();
        }

        return this;
    }
}

// Bind gallery extension to modals
MageModal.prototype.addCallback('initialize', function(modal) {
    if (!modal.gallery && modal.get('position') == 'gallery') {
        new MageModal_Gallery(modal);
    }
});

// Catch also on dynamic position mode changes
MageModal.prototype.addCallback('option_change', function(modal, option, oldValue, newValue) {
    if (option == 'position' && oldValue != 'gallery' && newValue == 'gallery') {
        new MageModal_Gallery(modal);
    } else if (option == 'position' && modal.gallery) {
        delete modal.gallery;
    }
});

// Collect images on page and group into galleries
MageModal_Manager.addListener(function() {
    Element.select(document.body,'[data-gallery]').each((function(el) {
        var options             = this.getOptions(el);
            options.autoOpen    = false;
            options.position    = 'gallery';
            options.id          = el.readAttribute('data-gallery') || null;

        // Auto-initialize instance
        var instance = el.readAttribute('data-instance');

        if (!instance) {
            // Binds to existing or static window
            if ($(options.id)) {
                el.modal = $(options.id).modal;
                el.writeAttribute('data-instance', options.id);
            } else {
                this.createInstance(el, options);
            }
        }

        var media = el.modal.gallery.getMediaByType(el);
        el.modal.gallery.addMedia(media);

        // Toggle gallery on hover
        if (options.hover) {
            el.observe('mouseover', this.open.bind(this, el, {
                galleryIndex: parseInt(media.readAttribute('data-index'), 10) || 0
            }));
        }

        // Always toggle gallery on click
        el.observe('click', this.open.bind(this, el, {
            galleryIndex: parseInt(media.readAttribute('data-index'), 10) || 0
        }));
    }).bind(this));
});

// Auto-load manager
$(document).observe('dom:loaded', function() {
    MageModal_Manager.refresh();
});